/** Keep source distances intact; describe the displayed ascent separately. */
export function directionPresentation(route) {
  const ascent = route.tripType === 'out_and_back' && route.id !== 'malinovaya-three-return';
  const partial = route.buildStatus === 'partial';
  return {
    ...route,
    displayDistanceM: ascent ? route.lineDistanceM : route.distanceM,
    displayDistanceLabel: !ascent ? route.distanceLabel :
      route.id === 'bolshoy-shatak-avzyan' ? 'До конца GPX, в одну сторону' :
      partial ? 'Доступная часть, в одну сторону' : 'В одну сторону',
    returnLabel: ascent ? 'Возвращение тем же путём.' : null,
  };
}
