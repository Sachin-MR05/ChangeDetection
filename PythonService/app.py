from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv
import uvicorn
from pathlib import Path
import base64
import io

from models.model_inference import ChangeDetectionModel

load_dotenv()

app = FastAPI(title="Change Detection ML Service")

# Load model once at startup
model = None

@app.on_event("startup")
async def startup_event():
    global model
    model_path = os.getenv("MODEL_PATH", "../siamese_unet_final.pth")
    device = os.getenv("DEVICE", "cpu")
    model = ChangeDetectionModel(model_path, device)
    print(f"✅ ML Model loaded from {model_path}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "change-detection-ml",
        "model_loaded": model is not None
    }

class PredictionRequest(BaseModel):
    request_id: str
    past_image_data: Optional[str] = None  # Base64-encoded image
    current_image_data: Optional[str] = None  # Base64-encoded image
    past_image_path: Optional[str] = None  # Fallback: file path
    current_image_path: Optional[str] = None  # Fallback: file path
    image_format: str = "png"  # Image format for decoding
    aoi_bbox: Optional[list] = None

class PredictionResponse(BaseModel):
    change_percentage: float
    change_map_path: str
    heatmap_path: Optional[str] = None

@app.post("/predict-change", response_model=PredictionResponse)
async def predict_change(request: PredictionRequest):
    """
    Main prediction endpoint
    Accepts either base64-encoded images or file paths
    """
    request_id = request.request_id
    past_image_path = None
    current_image_path = None
    temp_files = []
    
    try:
        # Create temp directory for this request
        temp_dir = Path(f"/tmp/change-detection/{request_id}")
        temp_dir.mkdir(parents=True, exist_ok=True)
        
        # Handle past image
        if request.past_image_data:
            # Decode base64 image data
            try:
                image_bytes = base64.b64decode(request.past_image_data)
                past_image_path = temp_dir / "past_image.png"
                with open(past_image_path, 'wb') as f:
                    f.write(image_bytes)
                temp_files.append(past_image_path)
                print(f"✅ Decoded past image (size: {len(image_bytes)} bytes)")
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to decode past image: {str(e)}")
        elif request.past_image_path:
            # Use provided file path (fallback)
            past_image_path = request.past_image_path
        else:
            raise HTTPException(status_code=400, detail="Either past_image_data or past_image_path must be provided")
        
        # Handle current image
        if request.current_image_data:
            # Decode base64 image data
            try:
                image_bytes = base64.b64decode(request.current_image_data)
                current_image_path = temp_dir / "current_image.png"
                with open(current_image_path, 'wb') as f:
                    f.write(image_bytes)
                temp_files.append(current_image_path)
                print(f"✅ Decoded current image (size: {len(image_bytes)} bytes)")
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to decode current image: {str(e)}")
        elif request.current_image_path:
            # Use provided file path (fallback)
            current_image_path = request.current_image_path
        else:
            raise HTTPException(status_code=400, detail="Either current_image_data or current_image_path must be provided")
        
        # Validate image paths exist
        if not os.path.exists(past_image_path):
            raise HTTPException(status_code=400, detail=f"Past image not found: {past_image_path}")
        
        if not os.path.exists(current_image_path):
            raise HTTPException(status_code=400, detail=f"Current image not found: {current_image_path}")
        
        # Create output directory
        output_dir = temp_dir / "outputs"
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Run ML inference
        result = model.detect_change(
            past_image_path=str(past_image_path),
            current_image_path=str(current_image_path),
            output_dir=str(output_dir),
            request_id=request_id,
            aoi_bbox=request.aoi_bbox
        )
        
        # Validate change percentage range
        if not (0 <= result["change_percentage"] <= 100):
            raise ValueError(f"Invalid change percentage: {result['change_percentage']}")
        
        print(f"✅ Prediction completed for {request_id}: {result['change_percentage']}% change")
        
        return PredictionResponse(
            change_percentage=result["change_percentage"],
            change_map_path=result["change_map_path"],
            heatmap_path=result.get("heatmap_path")
        )
        
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        print(f"❌ Inference error for {request_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Model inference failed")
    finally:
        # Cleanup temp files (optional - for production, you might want to keep them for debugging)
        import shutil
        for temp_file in temp_files:
            try:
                if temp_file.is_dir():
                    shutil.rmtree(temp_file)
                else:
                    temp_file.unlink()
            except Exception as cleanup_err:
                print(f"⚠️ Failed to cleanup {temp_file}: {cleanup_err}")

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    uvicorn.run(app, host="0.0.0.0", port=port)
