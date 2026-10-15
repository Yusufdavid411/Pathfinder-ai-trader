import 'package:firebase_core/firebase_core.dart';

class FirebaseAppService {
  const FirebaseAppService();

  Future<FirebaseApp> initialize() {
    return Firebase.initializeApp();
  }
}
