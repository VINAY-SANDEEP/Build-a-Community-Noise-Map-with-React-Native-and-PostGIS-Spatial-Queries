import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Modal, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import MapView, { Heatmap, Region, ProviderProp } from 'react-native-maps';
import { CALIBRATION_OFFSET } from './src/config';
import { submitNoiseReading, fetchHeatmapData, fetchAreaReport } from './src/api';

export default function App() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [decibel, setDecibel] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [timeFilter, setTimeFilter] = useState<'hour' | 'day' | 'all'>('all');
  const [report, setReport] = useState<{avg: string, max: string, count: number} | null>(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);

  const [region, setRegion] = useState<Region>({
    latitude: 40.7128,
    longitude: -74.0060,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  useEffect(() => {
    (async () => {
      let { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      if (locationStatus !== 'granted') {
        Alert.alert('Permission to access location was denied');
        return;
      }

      let { status: audioStatus } = await Audio.requestPermissionsAsync();
      if (audioStatus !== 'granted') {
        Alert.alert('Permission to access microphone was denied');
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
      setRegion({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });

      // Load initial heatmap data
      loadHeatmap(currentLocation.coords.latitude, currentLocation.coords.longitude, 'all');
    })();
  }, []);

  const loadHeatmap = async (lat: number, lng: number, filter: 'hour' | 'day' | 'all') => {
    try {
      // Load within ~10km radius
      const data = await fetchHeatmapData(lat, lng, 10000, filter);
      setHeatmapData(data);
    } catch (e: any) {
      console.warn("Heatmap load failed:", e.message);
    }
  };

  const onRegionChangeComplete = async (newRegion: Region) => {
    setRegion(newRegion);
    await loadHeatmap(newRegion.latitude, newRegion.longitude, timeFilter);
  };

  const handleTimeFilter = async (filter: 'hour' | 'day' | 'all') => {
    setTimeFilter(filter);
    await loadHeatmap(region.latitude, region.longitude, filter);
  };

  const handleMapTap = async (e: any) => {
    const coord = e.nativeEvent.coordinate;
    // creating a small bounding box around the tap for area report (~1km)
    const delta = 0.01;
    const minLat = coord.latitude - delta;
    const maxLat = coord.latitude + delta;
    const minLng = coord.longitude - delta;
    const maxLng = coord.longitude + delta;

    try {
      const data = await fetchAreaReport(minLng, minLat, maxLng, maxLat);
      setReport(data);
      setReportModalVisible(true);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const measureNoise = async () => {
    if (isRecording) return;
    try {
      setIsRecording(true);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => {
           if (status.isRecording && status.metering !== undefined) {
              const spl = status.metering + CALIBRATION_OFFSET;
              setDecibel(spl);
           }
        },
        250 // update interval ms
      );
      recordingRef.current = recording;

      // Stop recording after 3 seconds
      setTimeout(async () => {
        setIsRecording(false);
        if (recordingRef.current) {
           await recordingRef.current.stopAndUnloadAsync();
           
           if (decibel !== null && location) {
              try {
                 await submitNoiseReading(location.coords.latitude, location.coords.longitude, decibel);
                 Alert.alert("Success", "Reading submitted!");
                 // reload heatmap
                 loadHeatmap(region.latitude, region.longitude, timeFilter);
              } catch (e: any) {
                 Alert.alert("Error submitting reading", e.message);
              }
           }
        }
      }, 3000);

    } catch (err) {
      console.error('Failed to start recording', err);
      setIsRecording(false);
    }
  };

  return (
    <View style={styles.container}>
      <MapView 
        style={styles.map} 
        region={region}
        onRegionChangeComplete={onRegionChangeComplete}
        onPress={handleMapTap}
        testID="map-view"
      >
        {heatmapData.length > 0 && (
          <Heatmap
            points={heatmapData}
            radius={40}
            opacity={0.7}
            gradient={{
               colors: ["#0000ff", "#00ffff", "#00ff00", "#ffff00", "#ff0000"],
               startPoints: [0.1, 0.25, 0.5, 0.75, 1],
               colorMapSize: 200
            }}
          />
        )}
      </MapView>

      <View style={styles.topControls}>
        <View style={styles.filterGroup}>
          <TouchableOpacity 
            style={[styles.filterButton, timeFilter === 'hour' && styles.filterButtonActive]} 
            onPress={() => handleTimeFilter('hour')}
            testID="time-filter-hour"
          >
            <Text style={styles.filterText}>Hour</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, timeFilter === 'day' && styles.filterButtonActive]} 
            onPress={() => handleTimeFilter('day')}
            testID="time-filter-day"
          >
            <Text style={styles.filterText}>Day</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, timeFilter === 'all' && styles.filterButtonActive]} 
            onPress={() => handleTimeFilter('all')}
            testID="time-filter-all"
          >
            <Text style={styles.filterText}>All</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bottomControls}>
        <Text style={styles.dbText} testID="db-reading-display">
          {decibel ? `${decibel.toFixed(1)} dB` : '-- dB'}
        </Text>
        <TouchableOpacity 
           style={styles.recordButton} 
           onPress={measureNoise} 
           disabled={isRecording || !location}
           testID="take-reading-button"
        >
          {isRecording ? <ActivityIndicator color="#fff" /> : <Text style={styles.recordButtonText}>Take Reading</Text>}
        </TouchableOpacity>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={reportModalVisible}
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalView} testID="area-report-container">
          <Text style={styles.modalTitle}>Area Report</Text>
          {report ? (
             <>
                <Text style={styles.modalText}>Area Average: {report.avg ? report.avg + ' dB' : 'N/A'}</Text>
                <Text style={styles.modalText}>Area Max: {report.max ? report.max + ' dB' : 'N/A'}</Text>
                <Text style={styles.modalText}>Total Readings: {report.count}</Text>
             </>
          ) : (
             <Text style={styles.modalText}>No data for this area</Text>
          )}
          <TouchableOpacity
            style={[styles.recordButton, {marginTop: 15}]}
            onPress={() => setReportModalVisible(false)}
          >
            <Text style={styles.recordButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  topControls: {
    position: 'absolute',
    top: 50,
    width: '100%',
    alignItems: 'center',
  },
  filterGroup: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 5,
  },
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    fontWeight: 'bold',
    color: '#333',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 50,
    width: '100%',
    alignItems: 'center',
  },
  dbText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#007AFF',
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 20,
    overflow: 'hidden',
  },
  recordButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  recordButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalView: {
    margin: 20,
    marginTop: 'auto',
    marginBottom: 'auto',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 10,
  }
});
