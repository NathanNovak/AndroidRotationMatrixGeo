package com.androidbridge;

//import static com.google.android.gms.location.LocationServices.getFusedLocationProviderClient;

import static com.google.android.gms.location.LocationServices.getFusedLocationProviderClient;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.pm.PackageManager;
        import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.location.Location;
import android.location.LocationManager;
        import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;

import com.facebook.react.bridge.Arguments;
        import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
        import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.tasks.OnSuccessListener;

        import java.util.Arrays;
import java.util.concurrent.Executor;


public class CompassModule extends ReactContextBaseJavaModule implements SensorEventListener {
    private final ReactApplicationContext context;
    private FusedLocationProviderClient fusedLocationClient;
    private SensorManager sensorManager;

    private Sensor sensorRotationFromVector;

    private final float[] orientation = new float[3];
    private final float[] rotationMatrix = new float[9];
    private float[] mDeclination = new float[1];
    private float[] mLocation;
    private float azimuth = 0f;

    CompassModule(ReactApplicationContext context) {
        super(context);
        this.context = context;

        Log.d("Start", "Java started when selected in RN.");
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(context);

//        var location = getLastLocationIfApiAvailable(context);
//        Log.d("Location", "Location " + location);

        this.sensorManager = (SensorManager) context.getSystemService(Context.SENSOR_SERVICE);
        LocationManager locationManager = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
        this.sensorRotationFromVector = this.sensorManager.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);

        var list = locationManager.getAllProviders();
        Log.d("Providers", "Hello" + list.toString());

    }

    public float[] getLastLocationIfApiAvailable(Context context) {
        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED && ActivityCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            // TODO: Consider calling
            //    ActivityCompat#requestPermissions
            // here to request the missing permissions, and then overriding
            //   public void onRequestPermissionsResult(int requestCode, String[] permissions,
            //                                          int[] grantResults)
            // to handle the case where the user grants the permission. See the documentation
            // for ActivityCompat#requestPermissions for more details.
//            return TODO;
        }
//        fusedLocationClient.getLastLocation()
//                .addOnSuccessListener(new OnSuccessListener<Location>() {
//                    @Override
//                    public void onSuccess(Location location) {
//                        if (location != null) {
//                             Log.d("Location", "Location " + location);
//                        }
//                    }
//                });
//        return mLocation;
        return new float[0];
    };
//    private void requestRuntimePermissions() {
//        if (LocationPermissions.checkLocationPermission(this.context.getCurrentActivity())) {
//            Toast.makeText(this.context, "Permission Granted", Toast.LENGTH_LONG).show();
////            userLocation();
//        }
////        } else if (ActivityCompat.shouldShowRequestPermissionRationale(this.context.getCurrentActivity(), PERMISSION_LOCATION_ACCESS)) {
////            AlertDialog.Builder builder = new AlertDialog.Builder(this.context);
////            builder.setMessage("This app requires LOCATION to get the users declination")
////                    .setTitle("Permission Required")
////                    .setCancelable(false)
////                    .setPositiveButton("Ok", new DialogInterface.OnClickListener() {
////                        @Override
////                        public void onClick(DialogInterface dialog, int which) {
////                            ActivityCompat.requestPermissions(context.getCurrentActivity(), new String[]{PERMISSION_LOCATION_ACCESS}, PERMISSION_REQ_CODE);
////                            dialog.dismiss();
////                        }
////                    })
////                    .setNegativeButton("Cancel", (dialog, which) -> dialog.dismiss());
////
////            builder.show();
//
//
//        else {
////            ActivityCompat.requestPermissions(context.getCurrentActivity(), new String[]{PERMISSION_LOCATION_ACCESS}, PERMISSION_REQ_CODE);
//            LocationPermissions.requestLocationPermission(this.context.getCurrentActivity());
//        }
//    }

    private void sendEvent(ReactContext reactContext, String eventName, @Nullable WritableMap params) {

        reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
    }

    @ReactMethod
    public void startSensors() {
        this.sensorManager.registerListener(this, sensorRotationFromVector, SensorManager.SENSOR_DELAY_NORMAL);
        Log.d("MatrixDataModule", "Sensors started!");
    }

    @ReactMethod
    public void stopSensors() {
        sensorManager.unregisterListener(this, sensorRotationFromVector);
        Log.d("Compass", "All Sensors Stopped!!");
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        final float alpha = 0.97f;

        SensorManager.getRotationMatrixFromVector(rotationMatrix, event.values);

        SensorManager.getOrientation(rotationMatrix, orientation);

        Log.d("MatrixDataModule", Arrays.toString(rotationMatrix));
        azimuth = (float) Math.toDegrees(orientation[0]);
        azimuth = (azimuth + 360) % 360;
        azimuth = Math.round(azimuth);

        sendAzimuthChangeEvent();
    }

    private void sendAzimuthChangeEvent() {
        WritableMap wm = Arguments.createMap();

        wm.putDouble("newAzimuth", azimuth);
        wm.putDouble("yaw", orientation[0]);
        wm.putDouble("pitch", orientation[1]);
        wm.putDouble("roll", orientation[2]);
        wm.putDouble("M11", rotationMatrix[0]);
        wm.putDouble("M12", rotationMatrix[1]);
        wm.putDouble("M13", rotationMatrix[2]);
        wm.putDouble("M21", rotationMatrix[3]);
        wm.putDouble("M22", rotationMatrix[4]);
        wm.putDouble("M23", rotationMatrix[5]);
        wm.putDouble("M31", rotationMatrix[6]);
        wm.putDouble("M32", rotationMatrix[7]);
        wm.putDouble("M33", rotationMatrix[8]);

        sendEvent(this.context, "rotationMatrix", wm);
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {

    }

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
        } catch (RuntimeException e) {
            Log.e("ERROR", "java.lang.RuntimeException: Trying to invoke Javascript before CatalystInstance has been set!");
        }
    }

    @NonNull
    @Override
    public String getName() {
        return "CompassModule";
    }
}

