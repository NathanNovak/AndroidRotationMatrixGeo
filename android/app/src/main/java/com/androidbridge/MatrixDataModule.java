package com.androidbridge;

import android.Manifest;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.location.LocationRequest;
import android.os.Bundle;
import android.telecom.Call;
import android.util.Log;
import android.util.*;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.lang.reflect.Array;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;

public class MatrixDataModule extends ReactContextBaseJavaModule implements SensorEventListener {
    private static final String PERMISSION_LOCATION_ACCESS = Manifest.permission.ACCESS_FINE_LOCATION;
    private static final int PERMISSION_REQ_CODE = 100;
    private int listenerCount = 0;
    private final ReactApplicationContext context;
    private LocationRequest locationRequest;
    private SensorManager sensorManager;
    private Arguments arguments;
    private Callback callback;

    private Sensor sensorAccelerometer;
    private Sensor sensorMagneticField;
    private final float[] lastAccelerometer = new float[3];
    private final float[] lastMagnetometer = new float[3];
    private float[] rotationMatrixArray = new float[9];
    private final float[] orientation = new float[3];
    private final float[] rotationMatrix = new float[9];
    boolean isLastAccelerometerCopied = false;
    boolean isLastMagnetometerCopied = false;

    MatrixDataModule(ReactApplicationContext context) {
        super(context);
        this.context = context;

        this.sensorManager = (SensorManager)context.getSystemService(context.SENSOR_SERVICE);
        this.sensorAccelerometer = this.sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        this.sensorMagneticField = this.sensorManager.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD);
    }


    @ReactMethod
    public void StartSensor() {
        this.sensorManager.registerListener(this, sensorAccelerometer, SensorManager.SENSOR_DELAY_NORMAL);
        this.sensorManager.registerListener(this, sensorMagneticField, SensorManager.SENSOR_DELAY_NORMAL);
        Log.d("MatrixDataModule", "Sensors started: " );
    }

    @Override
    public void onSensorChanged(SensorEvent sensorEvent) {
//        if(this.listenerCount <= 0) {
//            return; // avoid all the computation if there are no observers
//        }
        double timeStamp = System.currentTimeMillis();
        WritableMap data = this.arguments.createMap();

        Log.d("MatrixDataModule", "Sensor is changing" + sensorEvent);
        if (sensorEvent.sensor == sensorAccelerometer) {
            System.arraycopy(sensorEvent.values, 0, lastAccelerometer, 0, sensorEvent.values.length);
            isLastAccelerometerCopied = true;
        } else if (sensorEvent.sensor == sensorMagneticField) {
            System.arraycopy(sensorEvent.values, 0, lastMagnetometer, 0, sensorEvent.values.length);
            isLastMagnetometerCopied = true;
        }

//        if (isLastAccelerometerCopied && isLastAccelerometerCopied && System.currentTimeMillis() - lastUpdatedTime > 250) {
        SensorManager.getRotationMatrix(rotationMatrix, null, lastAccelerometer, lastMagnetometer);
        SensorManager.getOrientation(rotationMatrix, orientation);
        System.arraycopy(rotationMatrix, 0, rotationMatrixArray, 0, rotationMatrixArray.length);

        Log.println(Log.WARN,"Matrix Array", Arrays.toString(rotationMatrix));


        data.putDouble("yaw", orientation[0]);
        data.putDouble("pitch", orientation[1]);
        data.putDouble("roll", orientation[2]);
        data.putDouble("m11", rotationMatrixArray[0]);
        data.putDouble("m12", rotationMatrixArray[1]);
        data.putDouble("m13", rotationMatrixArray[2]);
        data.putDouble("m21", rotationMatrixArray[3]);
        data.putDouble("m22", rotationMatrixArray[4]);
        data.putDouble("m23", rotationMatrixArray[5]);
        data.putDouble("m31", rotationMatrixArray[6]);
        data.putDouble("m32", rotationMatrixArray[7]);
        data.putDouble("m33", rotationMatrixArray[8]);

        sendEvent("RotationMatrix", data);
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {

    }

//    @ReactMethod
//    public void addListener(String eventName) {
//        this.listenerCount += 1;
//    }

    // Required for rn built in EventEmitter Calls.
    @ReactMethod
    public void addListener(String eventName) {
        Log.d("Matrix Array", "Listener has been ADDED: " + eventName);
    }

    @ReactMethod
    public void removeListeners(Integer count) {
        Log.d("Matrix Array", "Listener has been REMOVED: " + count);
    }


    @ReactMethod
    public void sendEvent(String eventName, @Nullable WritableMap params) {
        Log.d("Event", "Params" + params);
        try {
            this.context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit(eventName, params);
//        callback.invoke(params);
        }
        catch (RuntimeException e) {
            Log.e("ERROR", "java.lang.RuntimeException: Trying to invoke Javascript before CatalystInstance has been set!");
        }
    }

    @ReactMethod
    public void stopSensors() {
        sensorManager.unregisterListener(this, sensorAccelerometer);
        sensorManager.unregisterListener(this, sensorMagneticField);
        Log.d("MatrixDataModule", "All Sensors Stopped!!");
    }

    @NonNull
    @Override
    public String getName() {
        return "MatrixDataModule";
    }
}
