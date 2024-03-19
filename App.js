import React, {useEffect, useState} from 'react';
import {
  Button,
  NativeModules,
  NativeEventEmitter,
  View,
  Text,
  AppState,
  Animated,
  StyleSheet,
  Easing,
  Dimensions,
} from 'react-native';
import useCompassHook from './src/useCompass';

const {width} = Dimensions.get('window');

const App = () => {
  const useCompass = useCompassHook();

  const {MatrixDataModule, CompassModule} = NativeModules;

  const [message, setMessage] = useState('');
  const [orientationData, setOrientationData] = useState({
    strike: 0,
    dip: 0,
    trend: 0,
    plunge: 0,
  });

  const [eventData, setEventData] = useState({
    M11: 0,
    M12: 0,
    M13: 0,
    M21: 0,
    M22: 0,
    M23: 0,
    M31: 0,
    M32: 0,
    M33: 0,
    pitch: 0,
    roll: 0,
    yaw: 0,
    azimuth: 0,
  });
  const [transposedMatrix, setTransposedMatrix] = useState({
    M11: 0,
    M12: 0,
    M13: 0,
    M21: 0,
    M22: 0,
    M23: 0,
    M31: 0,
    M32: 0,
    M33: 0,
  });
  const [azimuthSpinValue] = useState(new Animated.Value(0));

  const MatrixEvents = new NativeEventEmitter(MatrixDataModule);
  const CompassEvents = new NativeEventEmitter(CompassModule);

  useEffect(() => {
    console.log('Sensors Starting');
    AppState.addEventListener('change', handleAppStateChange);
    return () => {
      stopSensors();
    };
  }, []);

  const getCartesianToSpherical = async (matrixRotationData, ios) => {
    let ENU_Pole;
    let ENU_TP;
    if (ios) {
      ENU_Pole = await useCompass.cartesianToSpherical(
        -matrixRotationData.m32avg,
        matrixRotationData.m31avg,
        matrixRotationData.m33avg,
      );
      ENU_TP = await useCompass.cartesianToSpherical(
        -matrixRotationData.m22avg,
        matrixRotationData.m21avg,
        matrixRotationData.m23avg,
      );
    } else {
      ENU_Pole = await useCompass.cartesianToSpherical(
        matrixRotationData.M31,
        matrixRotationData.M32,
        matrixRotationData.M33,
      );
      ENU_TP = await useCompass.cartesianToSpherical(
        matrixRotationData.M21,
        matrixRotationData.M22,
        matrixRotationData.M23,
      );
    }
    const strikeAndDip = await useCompass.strikeAndDip(ENU_Pole);
    const trendAndPlunge = await useCompass.trendAndPlunge(ENU_TP);
    setOrientationData({
      strike: roundToDecimalPlaces(strikeAndDip.strike, 0),
      dip: roundToDecimalPlaces(strikeAndDip.dip, 0),
      trend: roundToDecimalPlaces(trendAndPlunge.trend, 0),
      plunge: roundToDecimalPlaces(trendAndPlunge.plunge, 0),
    });
  };

  const handleEvent = res => {
    // console.log('Matrix Data', res);
    // setEventData({
    //   M11: roundToDecimalPlaces(res.M11, 2),
    //   M12: roundToDecimalPlaces(res.M12, 2),
    //   M13: roundToDecimalPlaces(res.M13, 2),
    //   M21: roundToDecimalPlaces(res.M21, 2),
    //   M22: roundToDecimalPlaces(res.M22, 2),
    //   M23: roundToDecimalPlaces(res.M23, 2),
    //   M31: roundToDecimalPlaces(res.M31, 2),
    //   M32: roundToDecimalPlaces(res.M32, 2),
    //   M33: roundToDecimalPlaces(res.M33, 2),
    //   pitch: roundToDecimalPlaces(res.pitch, 3),
    //   roll: roundToDecimalPlaces(res.roll, 3),
    //   yaw: roundToDecimalPlaces(res.yaw, 3),
    //   azimuth: res.newAzimuth,
    // });
    transposeMatrix(res);
  };

  const transposeMatrix = matrix => {
    console.log(matrix)
    const transposedMat = {
      M11: roundToDecimalPlaces(matrix.M11, 2),
      M12: roundToDecimalPlaces(matrix.M21, 2),
      M13: roundToDecimalPlaces(matrix.M31, 2),
      M21: roundToDecimalPlaces(matrix.M12, 2),
      M22: roundToDecimalPlaces(matrix.M22, 2),
      M23: roundToDecimalPlaces(matrix.M32, 2),
      M31: roundToDecimalPlaces(matrix.M13, 2),
      M32: roundToDecimalPlaces(matrix.M23, 2),
      M33: roundToDecimalPlaces(matrix.M33, 2),
    };
    console.log(transposedMat);
    setTransposedMatrix(transposedMat);
    getCartesianToSpherical(transposedMat);
  };

  const roundToDecimalPlaces = (value, places) => {
    const multiplier = Math.pow(10, places);
    return Math.round(value * multiplier) / multiplier;
  };

  const renderAzimuthSymbol = () => {
    let azimuth = eventData.azimuth || 0;
    let spin;
    let azimuthPointer = require('./assets/trendLine.png');
    spin = azimuthSpinValue.interpolate({
      inputRange: [0, 360],
      // inputRange: [0, 360], // Changed to get symbols to render while we figure out the android compass
      outputRange: ['0deg', azimuth + 'deg'],
      // outputRange: ['0deg', 180 + 'deg'], // Changed to get symbols to render while we figure out the android compass
    });
    // First set up animation

    Animated.timing(azimuthSpinValue, {
      duration: 500,
      toValue: azimuth,
      easing: Easing.linear(),
      useNativeDriver: true,
    }).start();

    return (
      <Animated.Image
        key={azimuthPointer}
        source={azimuthPointer}
        style={[styles.azimuthPointer, {transform: [{rotate: spin}]}]}
      />
    );
  };

  const startSensors = () => {
    console.log('Sensors are starting!');
    setMessage('SENSOR ARE GOING!');
    // MatrixDataModule.StartSensor();
    CompassModule.startSensors();
    CompassEvents.addListener('rotationMatrix', handleEvent);
  };

  const stopSensors = () => {
    console.log('Sensors are stopping!');
    // MatrixDataModule.stopSensors();
    setMessage('SENSOR ARE STOPPED!');
    CompassModule.stopSensors();
    // MatrixEvents.addListener('RotationMatrix', handleEvent).remove();
    CompassEvents.addListener('rotationMatrix', handleEvent).remove();
    console.log('Sensors STOPPED!');
  };

  const handleAppStateChange = state => {
    if (state === 'background' || state === 'inactive') {
      stopSensors();
    }
  };

  const Row = ({children}) => (
    <View style={{flexDirection: 'row'}}>{children}</View>
  );
  const Col = ({numRows, children}) => {
    return <View style={styles[`compassDataCol${numRows}`]}>{children}</View>;
  };

  const renderCompassData = () => (
    <View
      style={{
        // backgroundColor: 'white',
        padding: 20,
        // flex: 1,
        width: 350,
      }}>
      <View>
        <Text
          style={{textAlign: 'center', marginVertical: 20, fontWeight: 'bold'}}>
          Matrix Rotation
        </Text>
        <View style={styles.directionContainer}>
          <Text>East</Text>
          <Text>North</Text>
          <Text>Up</Text>
        </View>
        <View style={{padding: 20}}>
          <Row>
            <Col numRows={1}>
              <Text style={styles.colText}>X</Text>
            </Col>
            <Col numRows={3}>
              <Text style={styles.colText}>
                M11: {'\n'}
                {roundToDecimalPlaces(eventData.M11, 3)}
              </Text>
            </Col>
            <Col numRows={3}>
              <Text style={styles.colText}>
                M12: {'\n'}
                {roundToDecimalPlaces(eventData.M12, 3)}
              </Text>
            </Col>
            <Col numRows={3}>
              <Text style={styles.colText}>
                M13: {'\n'}
                {roundToDecimalPlaces(eventData.M13, 3)}
              </Text>
            </Col>
          </Row>
          <Row>
            <Col numRows={1}>
              <Text style={styles.colText}>Y</Text>
            </Col>
            <Col numRows={3}>
              <Text style={styles.colText}>
                M21: {'\n'}
                {roundToDecimalPlaces(eventData.M21, 3)}
              </Text>
            </Col>
            <Col numRows={3}>
              <Text style={styles.colText}>
                M22: {'\n'}
                {roundToDecimalPlaces(eventData.M22, 3)}
              </Text>
            </Col>
            <Col numRows={3}>
              <Text style={styles.colText}>
                M23: {'\n'}
                {roundToDecimalPlaces(eventData.M23, 3)}
              </Text>
            </Col>
          </Row>
          <Row>
            <Col numRows={1}>
              <Text style={styles.colText}>Z</Text>
            </Col>
            <Col numRows={3}>
              <Text style={styles.colText}>
                M31: {'\n'}
                {roundToDecimalPlaces(eventData.M31, 3)}
              </Text>
            </Col>
            <Col numRows={3}>
              <Text style={styles.colText}>
                M32: {'\n'}
                {roundToDecimalPlaces(eventData.M32, 3)}
              </Text>
            </Col>
            <Col numRows={3}>
              <Text style={styles.colText}>
                M33: {'\n'}
                {roundToDecimalPlaces(eventData.M33, 3)}
              </Text>
            </Col>
          </Row>
        </View>
      </View>
      {/*<View style={overlayStyles.overlayContent}>*/}
      {/*  <Text>Heading: {compassData.heading}</Text>*/}
      {/*  <Text>Strike: {roundToDecimalPlaces(compassData.strike, 0)}</Text>*/}
      {/*  <Text>Dip: {roundToDecimalPlaces(compassData.dip, 0)}</Text>*/}
      {/*  <Text>Plunge: {roundToDecimalPlaces(compassData.plunge, 0)}</Text>*/}
      {/*  <Text>Trend: {roundToDecimalPlaces(compassData.trend, 0)}</Text>*/}
      {/*</View>*/}
    </View>
  );

  const renderTransposedMatrixData = () => (
    <View
      style={{
        // backgroundColor: 'white',
        padding: 20,
        // flex: 1,
        width: 350,
      }}>
      <View>
        <Text
          style={{textAlign: 'center', marginVertical: 20, fontWeight: 'bold'}}>
          Transposed Matrix Rotation
        </Text>
        <View style={styles.directionContainer}>
          <Text>East</Text>
          <Text>North</Text>
          <Text>Up</Text>
        </View>
        <View style={{padding: 20}}>
          <Row>
            <Col numRows={1}>
              <Text style={styles.colText}>X</Text>
            </Col>
            <Col numRows={3}>
              <Text style={styles.colText}>
                M11: {'\n'}
                {roundToDecimalPlaces(transposedMatrix.M11, 3)}
              </Text>
            </Col>
            <Col numRows={3}>
              <Text style={styles.colText}>
                M12: {'\n'}
                {roundToDecimalPlaces(transposedMatrix.M12, 3)}
              </Text>
            </Col>
            <Col numRows={3}>
              <Text style={styles.colText}>
                M13: {'\n'}
                {roundToDecimalPlaces(transposedMatrix.M13, 3)}
              </Text>
            </Col>
          </Row>
          <Row>
            <Col numRows={1}>
              <Text style={styles.colText}>Y</Text>
            </Col>
            <Col numRows={3}>
              <Text style={styles.colText}>
                M21: {'\n'}
                {roundToDecimalPlaces(transposedMatrix.M21, 3)}
              </Text>
            </Col>
            <Col numRows={3}>
              <Text style={styles.colText}>
                M22: {'\n'}
                {roundToDecimalPlaces(transposedMatrix.M22, 3)}
              </Text>
            </Col>
            <Col numRows={3}>
              <Text style={styles.colText}>
                M23: {'\n'}
                {roundToDecimalPlaces(transposedMatrix.M23, 3)}
              </Text>
            </Col>
          </Row>
          <Row>
            <Col numRows={1}>
              <Text style={styles.colText}>Z</Text>
            </Col>
            <Col numRows={3}>
              <Text style={styles.colText}>
                M31: {'\n'}
                {roundToDecimalPlaces(transposedMatrix.M31, 3)}
              </Text>
            </Col>
            <Col numRows={3}>
              <Text style={styles.colText}>
                M32: {'\n'}
                {roundToDecimalPlaces(transposedMatrix.M32, 3)}
              </Text>
            </Col>
            <Col numRows={3}>
              <Text style={styles.colText}>
                M33: {'\n'}
                {roundToDecimalPlaces(transposedMatrix.M33, 3)}
              </Text>
            </Col>
          </Row>
        </View>
      </View>
      {/*<View style={overlayStyles.overlayContent}>*/}
      {/*  <Text>Heading: {compassData.heading}</Text>*/}
      {/*  <Text>Strike: {roundToDecimalPlaces(compassData.strike, 0)}</Text>*/}
      {/*  <Text>Dip: {roundToDecimalPlaces(compassData.dip, 0)}</Text>*/}
      {/*  <Text>Plunge: {roundToDecimalPlaces(compassData.plunge, 0)}</Text>*/}
      {/*  <Text>Trend: {roundToDecimalPlaces(compassData.trend, 0)}</Text>*/}
      {/*</View>*/}
    </View>
  );

  return (
    <View
      style={{
        marginVertical: 16,
        flex: 1,
        alignItems: 'center',
        backgroundColor: 'grey',
      }}>
      {/*<View style={{alignItems: 'center', paddingTop: 20}}>*/}
      {/*  {renderCompassData()}*/}
      {/*</View>*/}
      <View style={{alignItems: 'center', paddingTop: 20}}>
        {renderTransposedMatrixData()}
      </View>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        {/*{renderAzimuthSymbol()}*/}
        <Text style={styles.colText}>Heading: {eventData.azimuth}</Text>
        <Text style={styles.colText}>Strike: {orientationData.strike}</Text>
        <Text style={styles.colText}>Dip: {orientationData.dip}</Text>
        <Text style={styles.colText}>Trend: {orientationData.trend}</Text>
        <Text style={styles.colText}>Plunge: {orientationData.plunge}</Text>
        {/*<Text>Roll: {eventData.roll}</Text>*/}
        {/*<Text>Pitch: {eventData.pitch}</Text>*/}
        {/*<Text>Yaw: {eventData.yaw}</Text>*/}
      </View>
      <View
        style={{
          padding: 20,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Text
          style={
            message === 'SENSOR ARE STOPPED!'
              ? styles.messageStop
              : styles.messageStart
          }>
          {message}
        </Text>
      </View>
      <View>
        <View style={{padding: 20}}>
          <Button
            title={'Click to start matrix reading'}
            color={'#841584'}
            onPress={startSensors}
          />
        </View>
        <View style={{padding: 20}}>
          <Button
            title={'Click to stop matrix reading'}
            color={'#841584'}
            onPress={stopSensors}
          />
        </View>
      </View>
    </View>
  );
};

export default App;

const styles = StyleSheet.create({
  azimuthPointer: {
    // position: 'absolute',
    width: width / 5,
    height: width / 5,
    // left: '50%', // <-- center left/right
    // top: 160,
    resizeMode: 'contain',
    // transform: [{translateX: '-50%'}, {translateY: '50%'}, {rotate:}],
  },
  compassDataCol1: {
    flex: 1,
  },
  compassDataCol2: {
    borderWidth: 1,
    flex: 2,
  },
  compassDataCol3: {
    flex: 3,
  },
  colText: {
    fontWeight: '700',
    padding: 5,
    color: 'white',
  },
  directionContainer: {
    backgroundColor: 'yellow',
    flexDirection: 'row',
    justifyContent: 'space-around',
    height: 50,
    alignItems: 'center',
    // flex: 1,
  },
  messageStart: {
    fontWeight: 'bold',
    fontSize: 18,
    color: 'green',
  },
  messageStop: {
    fontWeight: 'bold',
    fontSize: 18,
    color: 'red',
  },
});
