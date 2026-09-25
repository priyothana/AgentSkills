# Data scripts

One-off and repeatable data scripts live here. They are reviewed like code and run by Ops with `psql -v ON_ERROR_STOP=1 -f <script>`.

Name one-off scripts `YYYY-MM-DD_<ticket>_<short-description>.sql`.
