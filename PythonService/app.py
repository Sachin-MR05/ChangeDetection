from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv
import uvicorn
from pathlib import Path
import base64

from models.model_inference import ChangeDetectionModel

load_dotenv()

app = FastAPI(title="Change Detection ML Service")

# Load model once at startup
model = None

@app.on_event("startup")
async def startup_event():
    global model
    model_path = os.getenv("MODEL_PATH", "./siamese_unet_final.pth")
    device = os.getenv("DEVICE", "cpu")
    model = ChangeDetectionModel(model_path, device)
    print(f"[STARTUP] ML Model loaded from {model_path}")

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
    # File path mode (local)
    past_image_path: Optional[str] = None
    current_image_path: Optional[str] = None
    output_dir: Optional[str] = None
    # Base64 mode (production)
    past_image_data: Optional[str] = None
    current_image_data: Optional[str] = None
    aoi_bbox: Optional[list] = None

class PredictionResponse(BaseModel):
    change_percentage: float
    # File mode (local development)
    change_map_path: Optional[str] = None
    heatmap_path: Optional[str] = None
    # Base64 mode (production/distributed)
    change_map_data: Optional[str] = None
    heatmap_data: Optional[str] = None

@app.post("/predict-change", response_model=PredictionResponse)
async def predict_change(request: PredictionRequest):
    """
    Main prediction endpoint
    Accepts either file paths (local mode) or base64 images (production mode)
    """
    request_id = request.request_id
    past_image_path = None
    current_image_path = None
    temp_files = []
    
    try:
        # Create temp directory for decoding base64 if needed
        temp_dir = Path(f"/tmp/change-detection/{request_id}")
        
        # Handle past image
        if request.past_image_data:
            # Decode base64 (production mode)
            temp_dir.mkdir(parents=True, exist_ok=True)
            try:
                image_bytes = base64.b64decode(request.past_image_data)
                past_image_path = temp_dir / "past_image.png"
                with open(past_image_path, 'wb') as f:
                    f.write(image_bytes)
                temp_files.append(past_image_path)
                print(f"[INFERENCE] Decoded past image (size: {len(image_bytes)} bytes)")
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to decode past image: {str(e)}")
        elif request.past_image_path:
            # Use file path (local mode)
            past_image_path = request.past_image_path
        else:
            raise HTTPException(status_code=400, detail="Either past_image_data or past_image_path must be provided")
        
        # Handle current image
        if request.current_image_data:
            # Decode base64 (production mode)
            temp_dir.mkdir(parents=True, exist_ok=True)
            try:
                image_bytes = base64.b64decode(request.current_image_data)
                current_image_path = temp_dir / "current_image.png"
                with open(current_image_path, 'wb') as f:
                    f.write(image_bytes)
                temp_files.append(current_image_path)
                print(f"[INFERENCE] Decoded current image (size: {len(image_bytes)} bytes)")
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to decode current image: {str(e)}")
        elif request.current_image_path:
            # Use file path (local mode)
            current_image_path = request.current_image_path
        else:
            raise HTTPException(status_code=400, detail="Either current_image_data or current_image_path must be provided")
        
        # Validate image paths exist
        if not os.path.exists(past_image_path):
            raise HTTPException(status_code=400, detail=f"Past image not found: {past_image_path}")
        
        if not os.path.exists(current_image_path):
            raise HTTPException(status_code=400, detail=f"Current image not found: {current_image_path}")
        
        # Determine output directory
        output_dir = request.output_dir or str(temp_dir / "outputs")
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        
        # Detect transmission mode (True if images sent as base64)
        is_base64_mode = request.past_image_data is not None
        print(f"[INFERENCE] Transmission mode: {'base64' if is_base64_mode else 'file paths'}")
        
        # Run ML inference
        result = model.detect_change(
            past_image_path=str(past_image_path),
            current_image_path=str(current_image_path),
            output_dir=output_dir,
            request_id=request_id,
            aoi_bbox=request.aoi_bbox
        )
        
        # Validate change percentage range
        if not (0 <= result["change_percentage"] <= 100):
            raise ValueError(f"Invalid change percentage: {result['change_percentage']}")
        
        # For base64 mode, encode output files to base64
        change_map_data = None
        heatmap_data = None
        
        if is_base64_mode:
            # Encode change map to base64
            if os.path.exists(result["change_map_path"]):
                with open(result["change_map_path"], 'rb') as f:
                    change_map_data = base64.b64encode(f.read()).decode('utf-8')
                print(f"[INFERENCE] Encoded change map (size: {len(change_map_data)} bytes)")
            
            # Encode heatmap to base64
            if result.get("heatmap_path") and os.path.exists(result["heatmap_path"]):
                with open(result["heatmap_path"], 'rb') as f:
                    heatmap_data = base64.b64encode(f.read()).decode('utf-8')
                print(f"[INFERENCE] Encoded heatmap (size: {len(heatmap_data)} bytes)")
        
        return PredictionResponse(
            change_percentage=result["change_percentage"],
            change_map_path=result["change_map_path"] if not is_base64_mode else None,
            heatmap_path=result.get("heatmap_path") if not is_base64_mode else None,
            change_map_data=change_map_data,
            heatmap_data=heatmap_data
        )
        
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        print(f"[INFERENCE] ERROR: Model inference error: {str(e)}")
        raise HTTPException(status_code=500, detail="Model inference failed")
    finally:
        # Cleanup temp files
        for temp_file in temp_files:
            try:
                if temp_file.is_dir():
                    import shutil
                    shutil.rmtree(temp_file)
                else:
                    temp_file.unlink()
            except Exception as cleanup_err:
                print(f"[INFERENCE] Warning: Failed to cleanup {temp_file}: {cleanup_err}")

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    uvicorn.run(app, host="0.0.0.0", port=port)