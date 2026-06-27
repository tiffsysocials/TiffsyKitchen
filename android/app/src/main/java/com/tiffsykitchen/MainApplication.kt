package com.tiffsykitchen

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.otahotupdate.OtaHotUpdate
import com.tiffsykitchen.smsconsent.SmsUserConsentPackage

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          add(SmsUserConsentPackage())
        },
      // react-native-ota-hot-update: load the OTA JS bundle when one is installed
      // (falls back to the bundled JS when none).
      jsBundleFilePath = OtaHotUpdate.bundleJS(applicationContext),
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}
