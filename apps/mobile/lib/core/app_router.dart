import 'package:go_router/go_router.dart';

import '../features/auth/login_screen.dart';
import '../features/dashboard/dashboard_screen.dart';
import '../features/settings/settings_screen.dart';
import '../features/splash/splash_screen.dart';
import 'app_routes.dart';

final appRouter = GoRouter(
  initialLocation: AppRoutes.splash,
  routes: [
    GoRoute(
      path: AppRoutes.splash,
      builder: (context, state) => const SplashScreen(),
    ),
    GoRoute(
      path: AppRoutes.login,
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: AppRoutes.dashboard,
      builder: (context, state) => const DashboardScreen(),
    ),
    GoRoute(
      path: AppRoutes.settings,
      builder: (context, state) => const SettingsScreen(),
    ),
  ],
);
