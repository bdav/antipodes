import { Loader } from '@googlemaps/js-api-loader';

const loader = new Loader({
    apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    version: "weekly",
    libraries: ["places", "marker"]
});

loader.load().then(() => {
    initMap();
}).catch(e => {
    console.error('Error loading Google Maps API:', e);
});

/**
 * --------------------------------------------------
 * Google Maps Events as of JavaScript API v3
 * --------------------------------------------------
 *   bounds_changed 👈 `fitBounds` triggers this
 *   center_changed
 *   click
 *   contextmenu
 *   dblclick
 *   drag 👈 `fitBounds` does _NOT_ trigger this
 *   dragend
 *   dragstart
 *   heading_changed
 *   idle
 *   maptypeid_changed
 *   mousemove
 *   mouseout
 *   mouseover
 *   projection_changed
 *   resize
 *   rightclick
 *   tilesloaded
 *   tilt_changed
 *   zoom_changed  👈 `fitBounds` triggers this
 **/

// Initialize and add the map
function initMap(): void {
    // Specify the initial coordinates
    const coordinates1 = new google.maps.LatLng({ lat: -33.42651995258547, lng: -70.66558906755355 }); // Santiago, Chile
    const coordinates2 = computeAntipode(coordinates1);

    // Create a map centered at the specified coordinates
    const map1El = document.getElementById('map1');
    const map2El = document.getElementById('map2');
    const input = document.getElementById('pac-input');

    if (!map1El || !map2El) {
        throw Error('Map elements not found.');
    }

    if (!input || !(input instanceof HTMLInputElement)) {
        throw Error('Input element not found.');
    }

    const map1 = new google.maps.Map(map1El, {
        zoom: 12, // Adjust the zoom level as needed
        center: coordinates1,
        mapId: 'map1'
    });
    // Create a marker for each place
    let marker1 = new google.maps.marker.AdvancedMarkerElement({
        map: map1,
        position: coordinates1
    });
    const map2 = new google.maps.Map(map2El, {
        zoom: 12, // Adjust the zoom level as needed
        center: coordinates2,
        mapId: 'map2'
    });
    // Create a marker for each place
    let marker2 = new google.maps.marker.AdvancedMarkerElement({
        map: map2,
        position: coordinates2
    });

    const searchBox = new google.maps.places.SearchBox(input);

    map1.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

    // --------------------------------------------------
    // Event listeners
    // --------------------------------------------------
    map1.addListener('drag', () => updateOtherMap(map1, map2));
    map2.addListener('drag', () => updateOtherMap(map2, map1));
    map1.addListener('zoom_changed', () => updateOtherMap(map1, map2));
    map2.addListener('zoom_changed', () => updateOtherMap(map2, map1));

    // Listen for the event fired when the user selects a prediction and retrieve more details for that place
    searchBox.addListener('places_changed', function () {
        const places = searchBox.getPlaces();
        if (!places || places.length === 0) {
            return;
        }
        marker1.map = null;
        marker2.map = null;
        // For each place, get the icon, name, and location
        const bounds = new google.maps.LatLngBounds();
        places.forEach(function (place) {
            if (!place.geometry) {
                console.log('Returned place contains no geometry');
                return;
            }
            // Create a marker for each place
            const position = place.geometry.location;
            validateLatLng(position);
            marker1 = new google.maps.marker.AdvancedMarkerElement({
                map: map1,
                title: place.name,
                position
            });
            marker2 = new google.maps.marker.AdvancedMarkerElement({
                map: map2,
                position: computeAntipode(position)
            });
            if (place.geometry.viewport) {
                // Only geocodes have viewport
                bounds.union(place.geometry.viewport);
            } else if (place.geometry.location) {
                bounds.extend(place.geometry.location);
            }
        });
        map1.fitBounds(bounds);
        if (places[0].geometry?.viewport) {
            map2.fitBounds(computeViewportAntipode(places[0].geometry.viewport));
        }
    });

    // --------------------------------------------------
    // Helpers
    // --------------------------------------------------

    function computeAntipode(latLng: google.maps.LatLng): google.maps.LatLng {
        const latitude = latLng.lat();
        const longitude = latLng.lng();

        // Validate input
        if (latitude < -90 || latitude > 90) {
            throw Error(`Invalid latitude ${latitude}.`);
        }
        if (longitude < -180 || longitude > 180) {
            throw Error(`Invalid longitude ${longitude}.`);
        }

        // Compute antipode
        return new google.maps.LatLng(
            -latitude,
            longitude < 0 ? 180 + longitude : longitude - 180,
        );
    }

    function computeViewportAntipode(
        viewport: google.maps.LatLngBounds,
    ): google.maps.LatLngBounds {
        // Validate input
        if (!viewport) {
            throw Error('Invalid viewport.');
        }

        //  INPUT
        //
        //   A + - - - - - - - - - + B  (NE) 15,15
        //     |                   |
        //     |                   |
        //   C + - - - - - - - - - + D
        //  (SW) (5,5)
        //
        //
        //  ANTIPODE perspective
        //
        // (-5, -175)
        //   C + - - - - - - - - - + D  (NE) (-5, -175)
        //     |                   |
        //     |                   |
        //   A + - - - - - - - - - + B  (-15, -165)
        //   (SW) (-15,-175)
        //

        const { south, east, west, north } = viewport.toJSON();
        const a = new google.maps.LatLng(north, west);
        const d = new google.maps.LatLng(south, east);

        // Construct antipode viewport
        const antipodeNorthEast = computeAntipode(d);
        const antipodeSouthWest = computeAntipode(a);

        return new google.maps.LatLngBounds(antipodeSouthWest, antipodeNorthEast);
    }

    function updateOtherMap(
        currentMap: google.maps.Map,
        otherMap: google.maps.Map,
    ) {
        const bounds = currentMap.getBounds();
        validateBounds(bounds);
        const viewportAntipode = computeViewportAntipode(bounds);
        otherMap.fitBounds(viewportAntipode, 0);
    }

    // Validation

    function validateBounds(
        bounds: google.maps.LatLngBounds | undefined,
    ): asserts bounds is google.maps.LatLngBounds {
        if (!bounds) {
            throw Error('Invalid bounds');
        }
    }

    function validateLatLng(
        latLng: google.maps.LatLng | undefined,
    ): asserts latLng is google.maps.LatLng {
        if (!latLng) {
            throw Error('Invalid LatLng');
        }
    }
}
