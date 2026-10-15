class AppConfig {
  const AppConfig._();

  static const appName = 'PathFinder AI Trader';
  static const environment = String.fromEnvironment(
    'PAT_ENV',
    defaultValue: 'development',
  );
}
