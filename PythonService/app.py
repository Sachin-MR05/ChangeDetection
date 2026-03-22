from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv
import uvicorn
from pathlib import Path

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
    past_image_path: str
    current_image_path: str
    output_dir: str
    aoi_bbox: Optional[list] = None

class PredictionResponse(BaseModel):
    change_percentage: float
    change_map_path: str
    heatmap_path: Optional[str] = None

@app.post("/predict-change", response_model=PredictionResponse)
async def predict_change(request: PredictionRequest):
    """
    Main prediction endpoint
    Accepts file paths, processes images, returns change detection result
    """
    try:
        # Validate input paths exist
        if not os.path.exists(request.past_image_path):
            raise HTTPException(status_code=400, detail=f"Past image not found: {request.past_image_path}")
        
        if not os.path.exists(request.current_image_path):
            raise HTTPException(status_code=400, detail=f"Current image not found: {request.current_image_path}")
        
        # Ensure output directory exists
        Path(request.output_dir).mkdir(parents=True, exist_ok=True)
        
        # Run ML inference
        result = model.detect_change(
            past_image_path=request.past_image_path,
            current_image_path=request.current_image_path,
            output_dir=request.output_dir,
            request_id=request.request_id,
            aoi_bbox=request.aoi_bbox
        )
        
        # Validate change percentage range
        if not (0 <= result["change_percentage"] <= 100):
            raise ValueError(f"Invalid change percentage: {result['change_percentage']}")
        
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
        print(f"❌ Inference error for {request.request_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Model inference failed")

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    uvicorn.run(app, host="0.0.0.0", port=port)
