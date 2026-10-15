import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/app_router.dart';
import 'theme/app_theme.dart';

void main() {
  runApp(const ProviderScope(child: PathFinderMobileApp()));
}

class PathFinderMobileApp extends ConsumerWidget {
  const PathFinderMobileApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'PathFinder AI Trader',
      theme: AppTheme.light,
      routerConfig: appRouter,
    );
  }
}
