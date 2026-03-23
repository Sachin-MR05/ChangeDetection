const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs").promises;
const jwt = require("jsonwebtoken");
const { INTERNAL_ERROR, MODEL_FAILURE, NO_IMAGERY_AVAILABLE } = require("../constants/errorCodes");
const responseHelper = require("../utils/responseHelper");
const copernicusService = require("../services/copernicusService");
const storageService = require("../services/storageService");
const imageService = require("../services/imageService");
const { createHistoryEntry } = require("../models/historyModel");
const axios = require("axios");
const config = require("../config");

/**
 * Controller for handling change detection requests
 */
const detectChange = async (req, res) => {
  const request_id = uuidv4();
  try {
    const { aoi, t1, t2, cloudThreshold, fallbackEnabled } = req.body;

    // 1. STORAGE INITIALIZATION
    // Create folders for this specific request: /data/{id}/{raw,processed,outputs}
    const workspace = await storageService.initWorkspace(request_id);

    // 2. DATA NORMALIZATION (BBox extraction)
    const bbox = aoi.bbox || (aoi.geometry ? extractBBox(aoi.geometry) : [0, 0, 0, 0]);

    // 3. SATELLITE DATA PIPELINE - Resolve best available imagery
    let scenes;
    try {
      scenes = await copernicusService.resolveProjectImagery(bbox, t1, t2, cloudThreshold);
    } catch (err) {
      if (err.message.startsWith("NO_IMAGERY_AVAILABLE")) {
        return responseHelper.error(res, NO_IMAGERY_AVAILABLE, err.message.replace(/_/g, " "), null, 404);
      }
      throw err;
    }

    const { scene1, scene2 } = scenes;

    // 4. PERSIST METADATA
    // Store resolved scene data in the workspace for traceability
    await storageService.saveMetadata(request_id, {
      request_info: { aoi, t1, t2, cloudThreshold, fallbackEnabled },
      resolved_scenes: { scene1, scene2 },
      workspace_paths: workspace
    });

    // 5. FETCH SATELLITE IMAGES
    // Download real imagery or generate demo images
    console.log(`[${request_id}] Fetching satellite imagery...`);
    const imagePaths = await imageService.fetchProjectImages(
      workspace, 
      scene1, 
      scene2, 
      bbox,
      config.useDemoMode || false
    );
    console.log(`[${request_id}] Images ready (demo_mode: ${imagePaths.is_demo_mode})`);

    // 6. READ IMAGES AND CONVERT TO BASE64
    console.log(`[${request_id}] Encoding images to base64...`);
    let pastImageBase64, currentImageBase64;
    try {
      const pastImageBuffer = await fs.readFile(imagePaths.past_image_path);
      const currentImageBuffer = await fs.readFile(imagePaths.current_image_path);
      
      pastImageBase64 = pastImageBuffer.toString("base64");
      currentImageBase64 = currentImageBuffer.toString("base64");
      console.log(`[${request_id}] Images encoded (past: ${pastImageBase64.length} bytes, current: ${currentImageBase64.length} bytes)`);
    } catch (encodeErr) {
      console.error(`[${request_id}] Failed to encode images:`, encodeErr.message);
      return responseHelper.error(res, INTERNAL_ERROR, "Failed to prepare images for processing", null, 500);
    }

    // 7. FORWARD TO PYTHON SERVICE (HTTP CALL)
    let detectionResult;
    try {
      const pythonPayload = {
        request_id,
        past_image_data: pastImageBase64,
        current_image_data: currentImageBase64,
        image_format: "png",
        aoi_bbox: bbox
      };

      console.log(`[${request_id}] Sending request to ML service...`);
      const pythonResponse = await axios.post(
        `${config.pythonServiceUrl}/predict-change`,
        pythonPayload,
        { timeout: 60000 }
      );
      
      detectionResult = pythonResponse.data;
    } catch (svcErr) {
      console.error(`[${request_id}] Python Service Failure:`, svcErr.message);
      
      if (svcErr.code === 'ECONNREFUSED') {
        return responseHelper.error(res, MODEL_FAILURE, "ML service is not running. Please start the Python service.", null, 503);
      }
      
      return responseHelper.error(res, MODEL_FAILURE, "The change detection model is currently unavailable.", null, 503);
    }

    // 7. MAP TO FROZEN RESPONSE SCHEMA
    let historySaved = false;

    const authenticatedUserId = resolveAuthenticatedUserId(req);

    if (authenticatedUserId) {
      try {
        await createHistoryEntry(
          authenticatedUserId,
          detectionResult.change_percentage,
          scene1.acquisitionDate,
          scene2.acquisitionDate,
          bbox
        );
        historySaved = true;
        console.log(`[${request_id}] Detection history saved for user ${authenticatedUserId}`);
      } catch (historyErr) {
        console.error(`[${request_id}] Failed to save detection history:`, historyErr.message);
      }
    }

    const finalResponse = {
      status: "success",
      data: {
        request_id,
        status: "completed",
        dates: {
          past_date: scene1.acquisitionDate,
          current_date: scene2.acquisitionDate,
          resolution_type: (t1 === scene1.acquisitionDate && t2 === scene2.acquisitionDate) ? "exact" : "fallback"
        },
        metrics: {
          change_percentage: detectionResult.change_percentage,
          changed_pixels: Math.round((detectionResult.change_percentage / 100) * 256 * 256),
          total_pixels: 256 * 256
        },
        outputs: {
          change_map: `/api/results/${request_id}/${path.basename(detectionResult.change_map_path)}`,
          heatmap: detectionResult.heatmap_path ? `/api/results/${request_id}/${path.basename(detectionResult.heatmap_path)}` : null,
          // Add raw satellite images
          past_image: `/api/results/${request_id}/raw/past.png`,
          current_image: `/api/results/${request_id}/raw/current.png`
        },
        metadata: {
          satellite_source: imagePaths.is_demo_mode ? "Demo (Synthetic)" : "Sentinel-2 MSI Level-2A",
          demo_mode: imagePaths.is_demo_mode,
          scene_ids: {
            past: scene1.productId,
            current: scene2.productId
          },
          cloud_coverage: {
            t1: scene1.cloudCover,
            t2: scene2.cloudCover
          },
          model_version: "siamese_unet_v1",
          processing_timestamp: new Date().toISOString(),
          history_saved: historySaved
        }
      }
    };

    return res.status(200).json(finalResponse);
  } catch (err) {
    console.error(`[${request_id}] Detection Controller Error:`, err.message);
    console.error(err.stack);
    return responseHelper.error(
      res,
      INTERNAL_ERROR,
      "An unexpected error occurred during change detection.",
      null,
      500
    );
  }
};

/**
 * Utility to extract BBox from GeoJSON Geometry
 */
function extractBBox(geometry) {
  if (!geometry) return [0, 0, 0, 0];
  
  // If already a bbox property in Feature
  if (geometry.bbox) return geometry.bbox;

  let coords = [];
  if (geometry.type === "Polygon") {
    coords = geometry.coordinates[0];
  } else if (geometry.type === "MultiPolygon") {
    coords = geometry.coordinates.flat(2);
  } else if (geometry.type === "Point") {
    coords = [geometry.coordinates];
  }

  if (coords.length === 0) return [0, 0, 0, 0];

  let minX = coords[0][0], minY = coords[0][1], maxX = coords[0][0], maxY = coords[0][1];

  for (const [x, y] of coords) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  return [minX, minY, maxX, maxY];
}

function resolveAuthenticatedUserId(req) {
  if (req.user?.id) {
    return req.user.id;
  }

  const authHeader = req.headers?.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded?.id || null;
  } catch (err) {
    return null;
  }
}

module.exports = { detectChange };
