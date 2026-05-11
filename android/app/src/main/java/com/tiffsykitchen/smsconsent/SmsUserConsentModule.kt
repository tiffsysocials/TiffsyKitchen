package com.tiffsykitchen.smsconsent

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.gms.auth.api.phone.SmsRetriever
import com.google.android.gms.common.api.CommonStatusCodes
import com.google.android.gms.common.api.Status

class SmsUserConsentModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    private var smsReceiver: BroadcastReceiver? = null
    private var receiverRegistered = false

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun addListener(eventName: String) {
        // No-op: required for NativeEventEmitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // No-op: required for NativeEventEmitter
    }

    @ReactMethod
    fun startListening(promise: Promise) {
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No active Activity to attach SMS User Consent to")
            return
        }
        try {
            SmsRetriever.getClient(activity).startSmsUserConsent(null)
                .addOnSuccessListener {
                    registerReceiver()
                    promise.resolve(true)
                }
                .addOnFailureListener { e ->
                    promise.reject("START_FAILED", e.localizedMessage ?: "startSmsUserConsent failed", e)
                }
        } catch (e: Exception) {
            promise.reject("START_FAILED", e.localizedMessage ?: "startSmsUserConsent threw", e)
        }
    }

    @ReactMethod
    fun stopListening(promise: Promise) {
        unregisterReceiver()
        promise.resolve(true)
    }

    private fun registerReceiver() {
        if (receiverRegistered) return
        smsReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                if (intent.action != SmsRetriever.SMS_RETRIEVED_ACTION) return
                val extras = intent.extras ?: return
                val status = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    extras.getParcelable(SmsRetriever.EXTRA_STATUS, Status::class.java)
                } else {
                    @Suppress("DEPRECATION")
                    extras.get(SmsRetriever.EXTRA_STATUS) as? Status
                } ?: return
                when (status.statusCode) {
                    CommonStatusCodes.SUCCESS -> {
                        val consentIntent: Intent? =
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                                extras.getParcelable(SmsRetriever.EXTRA_CONSENT_INTENT, Intent::class.java)
                            } else {
                                @Suppress("DEPRECATION")
                                extras.getParcelable(SmsRetriever.EXTRA_CONSENT_INTENT)
                            }
                        if (consentIntent != null) {
                            try {
                                reactApplicationContext.currentActivity?.startActivityForResult(consentIntent, CONSENT_REQUEST_CODE)
                            } catch (e: Exception) {
                                emit(EVENT_ERROR, e.localizedMessage ?: "Failed to launch consent UI")
                            }
                        }
                    }
                    CommonStatusCodes.TIMEOUT -> {
                        emit(EVENT_ERROR, "Timeout — no matching SMS within 5 minutes")
                        unregisterReceiver()
                    }
                }
            }
        }
        val filter = IntentFilter(SmsRetriever.SMS_RETRIEVED_ACTION)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            reactApplicationContext.registerReceiver(
                smsReceiver,
                filter,
                SmsRetriever.SEND_PERMISSION,
                null,
                Context.RECEIVER_EXPORTED
            )
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            reactApplicationContext.registerReceiver(
                smsReceiver,
                filter,
                SmsRetriever.SEND_PERMISSION,
                null
            )
        }
        receiverRegistered = true
    }

    private fun unregisterReceiver() {
        if (!receiverRegistered) return
        try {
            reactApplicationContext.unregisterReceiver(smsReceiver)
        } catch (_: Exception) {
        }
        smsReceiver = null
        receiverRegistered = false
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != CONSENT_REQUEST_CODE) return
        if (resultCode == Activity.RESULT_OK && data != null) {
            val sms = data.getStringExtra(SmsRetriever.EXTRA_SMS_MESSAGE)
            if (!sms.isNullOrEmpty()) {
                emit(EVENT_OTP_RECEIVED, sms)
            } else {
                emit(EVENT_ERROR, "Consent granted but SMS body was empty")
            }
        } else {
            emit(EVENT_ERROR, "User denied SMS consent")
        }
        unregisterReceiver()
    }

    override fun onNewIntent(intent: Intent) {
        // Not used
    }

    private fun emit(event: String, payload: String) {
        if (!reactApplicationContext.hasActiveReactInstance()) return
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(event, payload)
    }

    override fun invalidate() {
        unregisterReceiver()
        super.invalidate()
    }

    companion object {
        const val NAME = "SmsUserConsent"
        const val EVENT_OTP_RECEIVED = "SmsUserConsent_otpReceived"
        const val EVENT_ERROR = "SmsUserConsent_error"
        private const val CONSENT_REQUEST_CODE = 4827
    }
}
