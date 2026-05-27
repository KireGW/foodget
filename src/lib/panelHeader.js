export function shouldIgnorePanelHeaderClick(event) {
  return Boolean(
    event.target.closest(
      'a, button, input, label, select, textarea, [role="button"], [data-panel-header-ignore]',
    ),
  )
}
