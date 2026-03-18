const axios = require("axios");
const qs = require("qs");
const config = require("../config");

let cachedToken = null;
let tokenExpiry = 0;

/**
 * Copernicus Sentinel Hub Service
 * Uses the Process API to fetch actual satellite imagery
 */
const copernicusService = {
  /**
   * Get OAuth2 Access Token from Copernicus Identity Server
   */
  async getAccessToken() {
    // Return cached token if still valid (with 1 min buffer)
    if (cachedToken && Date.now() < tokenExpiry - 60000) {
      return cachedToken;
    }

    try {
      const response = await axios.post(
        config.copernicus.tokenUrl,
        qs.stringify({
          grant_type: "client_credentials",
          client_id: config.copernicus.clientId,
          client_secret: config.copernicus.clientSecret,
        }),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );

      cachedToken = response.data.access_token;
      tokenExpiry = Date.now() + response.data.expires_in * 1000;
      console.log("✅ Copernicus token received");
      return cachedToken;
    } catch (error) {
      console.error("Copernicus Auth Error:", error.response?.data || error.message);
      throw new Error("FAILED_COPERNICUS_AUTH");
    }
  },

  /**
   * Build evalscript for Sentinel-2 true color with cloud masking
   */
  buildEvalscript() {
    return `
//VERSION=3
function setup() {
  return {
    input: ["B02", "B03", "B04", "SCL"],
    output: { bands: 3, sampleType: "UINT8" }
  };
}

function evaluatePixel(sample) {
  // SCL cloud mask: 3=shadow, 8=cloud medium, 9=cloud high, 10=cirrus
  if ([3, 8, 9, 10].includes(sample.SCL)) {
    return [0, 0, 0]; // mask clouds as black
  }
  // True color RGB (B04=Red, B03=Green, B02=Blue)
  let gain = 2.5;
  return [
    Math.min(255, sample.B04 * gain * 255),
    Math.min(255, sample.B03 * gain * 255),
    Math.min(255, sample.B02 * gain * 255)
  ];
}
`;
  },

  /**
   * Fetch satellite image for a specific date range using Process API
   * @param {Array} bbox [minLon, minLat, maxLon, maxLat]
   * @param {string} dateFrom YYYY-MM-DD
   * @param {string} dateTo YYYY-MM-DD
   * @returns {Buffer} Image data
   */
  async fetchImage(bbox, dateFrom, dateTo) {
    const token = await this.getAccessToken();
    const [minLon, minLat, maxLon, maxLat] = bbox;

    const payload = {
      input: {
        bounds: {
          bbox: [minLon, minLat, maxLon, maxLat],
          properties: {
            crs: "http://www.opengis.net/def/crs/EPSG/0/4326"
          }
        },
        data: [{
          type: "sentinel-2-l2a",
          dataFilter: {
            timeRange: {
              from: `${dateFrom}T00:00:00Z`,
              to: `${dateTo}T23:59:59Z`
            },
            maxCloudCoverage: 30
          },
          processing: {
            harmonizeValues: true
          }
        }]
      },
      evalscript: this.buildEvalscript(),
      output: {
        responses: [{
          identifier: "default",
          format: { type: "image/png" }
        }],
        width: 256,
        height: 256
      }
    };

    try {
      console.log(`📡 Fetching Sentinel-2 imagery for ${dateFrom} to ${dateTo}...`);
      
      const response = await axios.post(
        `${config.copernicus.endpoint}/api/v1/process`,
        payload,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "Accept": "image/png"
          },
          responseType: "arraybuffer",
          timeout: 60000
        }
      );

      console.log(`✅ Image received: ${response.data.byteLength} bytes`);
      return {
        data: Buffer.from(response.data),
        contentType: "image/png",
        dateRange: { from: dateFrom, to: dateTo }
      };
    } catch (error) {
      console.error("Copernicus Process API Error:", error.response?.status, error.response?.data?.toString() || error.message);
      
      if (error.response?.status === 400) {
        throw new Error("NO_IMAGERY_AVAILABLE");
      }
      throw new Error("COPERNICUS_FETCH_FAILED");
    }
  },

  /**
   * Get scene metadata (simplified - we use date range approach)
   */
  async findBestScene(bbox, targetDate, cloudThreshold = 30) {
    // Create a 15-day window around the target date
    const dateObj = new Date(targetDate);
    const startDate = new Date(dateObj);
    startDate.setDate(dateObj.getDate() - 15);
    const endDate = new Date(dateObj);
    endDate.setDate(dateObj.getDate() + 15);

    return {
      productId: `sentinel-2-l2a-${targetDate}`,
      productName: `Sentinel-2 L2A ${targetDate}`,
      acquisitionDate: targetDate,
      cloudCover: cloudThreshold,
      status: "available",
      dateRange: {
        from: startDate.toISOString().split("T")[0],
        to: endDate.toISOString().split("T")[0]
      }
    };
  },

  /**
   * Resolve imagery metadata for both t1 and t2
   */
  async resolveProjectImagery(bbox, t1, t2, cloudThreshold) {
    const [scene1, scene2] = await Promise.all([
      this.findBestScene(bbox, t1, cloudThreshold),
      this.findBestScene(bbox, t2, cloudThreshold),
    ]);

    return { scene1, scene2 };
  },

  /**
   * Download actual imagery for a scene
   */
  async downloadSceneImage(bbox, scene) {
    return await this.fetchImage(
      bbox,
      scene.dateRange.from,
      scene.dateRange.to
    );
  }
};

module.exports = copernicusService;
