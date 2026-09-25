# Requirement: archive projects

Organization admins can archive a project. Archived projects disappear from the
default project list but can still be fetched by ID. Members and viewers must
not be able to archive.

The old soft-delete left some projects with `deleted = 1` in production. Those
projects must show up as archived once this ships, and the `deleted` column will
be dropped in a later release.
