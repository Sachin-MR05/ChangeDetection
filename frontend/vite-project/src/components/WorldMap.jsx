import { useEffect, useRef, forwardRef, useImperativeHandle } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import "leaflet-draw/dist/leaflet.draw.css"
import "leaflet-draw"

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const WorldMap = forwardRef(function WorldMap({ setAoi, onDrawStart, onDrawEnd }, ref) {
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const drawnItemsRef = useRef(null)
  const drawControlRef = useRef(null)

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    startDrawing: () => {
      if (drawControlRef.current && mapInstanceRef.current) {
        new L.Draw.Rectangle(mapInstanceRef.current, drawControlRef.current.options.draw.rectangle).enable();
        onDrawStart?.();
      }
    },
    startEditing: () => {
      if (drawnItemsRef.current && mapInstanceRef.current) {
        drawnItemsRef.current.eachLayer(layer => {
          if (layer.editing) {
            layer.editing.enable();
          }
        });
      }
    },
    clearDrawing: () => {
      if (drawnItemsRef.current) {
        drawnItemsRef.current.clearLayers();
        setAoi(null);
      }
    }
  }));

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return

    // Initialize map with better default view
    const map = L.map(mapContainerRef.current, {
      center: [20, 78], // Center on India for demo
      zoom: 5,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: true
    })
    mapInstanceRef.current = map

    // Add satellite tile layer (Esri World Imagery)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri',
      maxZoom: 18
    }).addTo(map)

    // Add labels overlay
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
      attribution: '',
      subdomains: 'abcd',
      maxZoom: 18,
      pane: 'shadowPane'
    }).addTo(map)

    // Initialize FeatureGroup for drawn items
    const drawnItems = new L.FeatureGroup()
    map.addLayer(drawnItems)
    drawnItemsRef.current = drawnItems

    // Initialize draw control with proper rectangle settings
    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        rectangle: {
          shapeOptions: {
            color: '#00d4ff',
            weight: 2,
            fillColor: '#00d4ff',
            fillOpacity: 0.15
          },
          showArea: true,
          metric: ['km', 'm'],
          repeatMode: false
        },
        polygon: false,
        circle: false,
        polyline: false,
        marker: false,
        circlemarker: false
      },
      edit: {
        featureGroup: drawnItems,
        remove: true,
        edit: {
          selectedPathOptions: {
            maintainColor: true,
            opacity: 0.3,
            weight: 3
          }
        }
      }
    })
    drawControlRef.current = drawControl
    map.addControl(drawControl)

    // Handle draw started event - show feedback
    map.on(L.Draw.Event.DRAWSTART, () => {
      console.log('🖱️ Drawing started - click and drag to create rectangle')
    })

    // Handle draw created event
    map.on(L.Draw.Event.CREATED, (e) => {
      const layer = e.layer
      
      // Clear previous drawings
      drawnItems.clearLayers()
      
      // Add new drawing with premium style
      layer.setStyle({
        color: '#00e676',
        weight: 2,
        fillColor: '#00e676',
        fillOpacity: 0.15
      })
      drawnItems.addLayer(layer)
      
      // Get bounds and create bbox
      const bounds = layer.getBounds()
      const bbox = [
        bounds.getWest(),  // minLon
        bounds.getSouth(), // minLat
        bounds.getEast(),  // maxLon
        bounds.getNorth()  // maxLat
      ]
      
      // Calculate area in km²
      const latHeight = (bbox[3] - bbox[1]) * 111
      const lonWidth = (bbox[2] - bbox[0]) * 111 * Math.cos((bbox[1] + bbox[3]) / 2 * Math.PI / 180)
      const areaKm2 = Math.abs(latHeight * lonWidth)
      
      console.log('📍 AOI Selected:', bbox)
      console.log('📏 Area:', areaKm2.toFixed(2), 'km²')
      
      setAoi({ 
        bbox,
        geometry: layer.toGeoJSON().geometry,
        area: areaKm2
      })
      
      // Notify parent that drawing ended
      onDrawEnd?.()
      
      // Fit map to the drawn area with padding
      map.fitBounds(bounds, { padding: [50, 50] })
    })

    // Handle draw edited event (final save)
    map.on(L.Draw.Event.EDITED, (e) => {
      const layers = e.layers
      layers.eachLayer((layer) => {
        const bounds = layer.getBounds()
        const bbox = [
          bounds.getWest(),
          bounds.getSouth(),
          bounds.getEast(),
          bounds.getNorth()
        ]
        
        const latHeight = (bbox[3] - bbox[1]) * 111
        const lonWidth = (bbox[2] - bbox[0]) * 111 * Math.cos((bbox[1] + bbox[3]) / 2 * Math.PI / 180)
        const areaKm2 = Math.abs(latHeight * lonWidth)
        
        console.log('✏️ AOI Edited:', bbox)
        console.log('📏 New Area:', areaKm2.toFixed(2), 'km²')
        
        setAoi({ 
          bbox,
          geometry: layer.toGeoJSON().geometry,
          area: areaKm2
        })
      })
    })

    // Real-time update during editing (resize/move)
    map.on('draw:editresize draw:editmove', (e) => {
      const layer = e.layer
      if (layer && layer.getBounds) {
        const bounds = layer.getBounds()
        const bbox = [
          bounds.getWest(),
          bounds.getSouth(),
          bounds.getEast(),
          bounds.getNorth()
        ]
        
        const latHeight = (bbox[3] - bbox[1]) * 111
        const lonWidth = (bbox[2] - bbox[0]) * 111 * Math.cos((bbox[1] + bbox[3]) / 2 * Math.PI / 180)
        const areaKm2 = Math.abs(latHeight * lonWidth)
        
        setAoi({ 
          bbox,
          geometry: layer.toGeoJSON().geometry,
          area: areaKm2
        })
      }
    })

    // Handle draw deleted event
    map.on(L.Draw.Event.DELETED, () => {
      console.log('🗑️ AOI Cleared')
      setAoi(null)
    })

    // Cleanup
    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [setAoi])

  return (
    <div 
      ref={mapContainerRef} 
      style={{ 
        height: '100%', 
        width: '100%',
        minHeight: '600px',
        position: 'relative',
        zIndex: 0,
        borderRadius: '10px',
        background: '#0a0a0a'
      }}
    />
  )
})

export default WorldMap
