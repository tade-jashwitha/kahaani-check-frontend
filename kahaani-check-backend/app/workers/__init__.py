# Workers package
#
# Background tasks that run alongside the FastAPI application.
# Workers are started by the application lifespan and stopped
# on shutdown.
#
# Workers:
#   schedule_worker — scans weekly_schedules and creates upcoming check-ins
