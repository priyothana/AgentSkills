# Bug: search results are wrong and errors after leaving the page

Reported by support:

1. When typing quickly, the results list sometimes shows matches for an earlier query instead of what is in the box.
2. After leaving the search page, the console logs "setState called on unmounted component" whenever the catalog refreshes in the background.
3. When nothing matches, the page is just blank, and when the search API fails nothing tells the user.

Fix these.
