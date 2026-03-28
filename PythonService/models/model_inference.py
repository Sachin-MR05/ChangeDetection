import torch
import torch.nn as nn
import numpy as np
import cv2
from pathlib import Path
import os

class ConvBlock(nn.Module):
    """Convolutional block with BatchNorm and ReLU"""
    def __init__(self, in_ch, out_ch):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(in_ch, out_ch, 3, padding=1),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_ch, out_ch, 3, padding=1),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True)
        )
    
    def forward(self, x):
        return self.block(x)

class Encoder(nn.Module):
    """Encoder module"""
    def __init__(self):
        super().__init__()
        self.c1 = ConvBlock(3, 64)
        self.c2 = ConvBlock(64, 128)
        self.c3 = ConvBlock(128, 256)
        self.pool = nn.MaxPool2d(2, 2)
    
    def forward(self, x):
        c1 = self.c1(x)
        p1 = self.pool(c1)
        c2 = self.c2(p1)
        p2 = self.pool(c2)
        c3 = self.c3(p2)
        p3 = self.pool(c3)
        return c1, c2, c3, p3

class Decoder(nn.Module):
    """Decoder module"""
    def __init__(self):
        super().__init__()
        self.up2 = nn.ConvTranspose2d(256, 128, 2, stride=2)
        self.c2 = ConvBlock(256, 128)
        self.up1 = nn.ConvTranspose2d(128, 64, 2, stride=2)
        self.c1 = ConvBlock(128, 64)
        self.final = nn.Conv2d(64, 1, 1)
    
    def forward(self, e1, e2, e3):
        u2 = self.up2(e3)
        u2 = torch.cat([u2, e2], dim=1)
        c2 = self.c2(u2)
        
        u1 = self.up1(c2)
        u1 = torch.cat([u1, e1], dim=1)
        c1 = self.c1(u1)
        
        out = self.final(c1)
        return torch.sigmoid(out)

class SiameseUNet(nn.Module):
    """Siamese U-Net for change detection"""
    def __init__(self):
        super().__init__()
        self.encoder = Encoder()
        self.decoder = Decoder()
    
    def forward(self, x1, x2):
        # Encode both images
        e1_1, e2_1, e3_1, p3_1 = self.encoder(x1)
        e1_2, e2_2, e3_2, p3_2 = self.encoder(x2)
        
        # Compute difference
        e1_diff = torch.abs(e1_1 - e1_2)
        e2_diff = torch.abs(e2_1 - e2_2)
        e3_diff = torch.abs(e3_1 - e3_2)
        
        # Decode
        out = self.decoder(e1_diff, e2_diff, e3_diff)
        return out


class ChangeDetectionModel:
    """Change Detection ML Model Wrapper using Siamese U-Net"""
    
    def __init__(self, model_path, device="cpu"):
        """Load model at initialization"""
        import os
        self.model_path = os.path.abspath(model_path)
        self.device = torch.device(device)
        
        print(f"[MODEL] Looking for model at: {self.model_path}")
        
        # Load the trained model
        self.model = SiameseUNet()
        
        if os.path.exists(self.model_path):
            try:
                checkpoint = torch.load(self.model_path, map_location=self.device)
                self.model.load_state_dict(checkpoint)
                print(f"[MODEL] Successfully loaded trained model from {self.model_path}")
                print(f"[MODEL] Model contains {len(checkpoint)} parameter tensors")
                
                # Verify model is not random by checking a sample weight
                sample_weight = list(checkpoint.values())[0]
                print(f"[MODEL] Sample weight shape: {sample_weight.shape}, mean: {sample_weight.mean():.6f}, std: {sample_weight.std():.6f}")
            except Exception as e:
                print(f"[MODEL] ERROR: Failed to load model weights: {str(e)}")
                print(f"[MODEL] WARNING: Using untrained model (random weights)")
        else:
            print(f"[MODEL] ERROR: Model file not found at {self.model_path}")
            print(f"[MODEL] WARNING: Using untrained model (random weights)")
        
        self.model.to(self.device)
        self.model.eval()
        print(f"[MODEL] Model initialized on device: {self.device}")
    
    def preprocess_image(self, image_path, target_size=(256, 256)):
        """
        Load and preprocess image for model input
        """
        print(f"[PREPROCESS] Loading image from: {image_path}")
        
        img = cv2.imread(image_path)
        if img is None:
            raise FileNotFoundError(f"Failed to load image: {image_path}")
        
        print(f"[PREPROCESS] Image shape before resize: {img.shape}, dtype: {img.dtype}, min: {img.min()}, max: {img.max()}")
        
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img = cv2.resize(img, target_size)
        img = img.astype(np.float32) / 255.0
        
        print(f"[PREPROCESS] Image shape after preprocessing: {img.shape}, normalized min: {img.min():.4f}, max: {img.max():.4f}")
        
        img = np.transpose(img, (2, 0, 1))  # HWC to CHW
        img = torch.from_numpy(img).unsqueeze(0)  # Add batch dimension
        return img
    
    def detect_change(self, past_image_path, current_image_path, output_dir, request_id, aoi_bbox=None):
        """
        Main inference logic
        """
        try:
            # Load and preprocess images
            print(f"[INFERENCE] Starting change detection for {request_id}")
            past_img = self.preprocess_image(past_image_path)
            current_img = self.preprocess_image(current_image_path)
            
            # Move to device
            past_img = past_img.to(self.device)
            current_img = current_img.to(self.device)
            
            print(f"[INFERENCE] Running model inference...")
            # Run inference
            with torch.no_grad():
                change_map = self.model(past_img, current_img)
            
            # Post-process output
            change_map = change_map.cpu().squeeze().numpy()
            print(f"[INFERENCE] Raw change map shape: {change_map.shape}, min: {change_map.min():.4f}, max: {change_map.max():.4f}")
            
            change_map = (change_map * 255).astype(np.uint8)
            
            # Calculate change percentage
            threshold = 0.5
            changed_pixels = np.sum(change_map > (threshold * 255))
            total_pixels = change_map.shape[0] * change_map.shape[1]
            change_percentage = (changed_pixels / total_pixels) * 100
            
            print(f"[INFERENCE] Changed pixels: {changed_pixels}/{total_pixels}, Percentage: {change_percentage:.2f}%")
            
            # Ensure valid range
            change_percentage = max(0.0, min(100.0, change_percentage))
            
            # Generate output visualizations
            change_map_path = os.path.join(output_dir, f"{request_id}_change_map.png")
            heatmap_path = os.path.join(output_dir, f"{request_id}_heatmap.png")
            
            # Create colored change map
            colored = cv2.applyColorMap(change_map, cv2.COLORMAP_JET)
            cv2.imwrite(change_map_path, colored)
            
            # Create binary heatmap
            _, binary = cv2.threshold(change_map, int(threshold * 255), 255, cv2.THRESH_BINARY)
            cv2.imwrite(heatmap_path, binary)
            
            print(f"[INFERENCE] Change detection complete: {change_percentage:.2f}%")
            
            return {
                "change_percentage": round(change_percentage, 2),
                "change_map_path": change_map_path,
                "heatmap_path": heatmap_path
            }
            
        except Exception as e:
            print(f"[INFERENCE] ERROR: Model inference error: {str(e)}")
            raise
