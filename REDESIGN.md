# Approved layout

The approved visual baseline is commit `b1f03b806815eaf314d2d5a9636adf4936ad8880`.
It is a plain white page with one compact "I'm not a human" checkbox, the
MeatBlock name and original tagline, and a blue-header challenge dialog.

Keep the parody in the existing questions, feedback, tagline, and fictional
results. Do not restore a marketing hero, navigation bar, pricing, product
features, a threat-model section, telemetry, or support sections without an
explicit new request to change the layout.

The later marketing additions in `c749dbef4590ea0e820d1315d4fcc86af488ab6a`
were rejected and are removed. The original HTML and icon are restored exactly.
The original CSS is preserved with only a rule for the feedback progression label.

## Automatic progression

After Verify, show the existing feedback for two seconds, then advance once.
Do the same after the final response to display the result. Do not require a
Next click. Closing the challenge, opening Help, or hiding the tab pauses the
transition; resuming starts a fresh reading delay. Restart cancels old callbacks.

Do not change the scoring engine, questions, result layout, or dependencies as
part of the automatic-progression request. See `QA.md` for verification scope.
