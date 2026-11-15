const wrap = angle => ((angle % 360) + 360) % 360;

export function readHeading(event) {
  if (Number.isFinite(event.webkitCompassHeading) && event.webkitCompassHeading >= 0) {
    return { heading: wrap(event.webkitCompassHeading), source: 'compass', priority: 3 };
  }
  if (Number.isFinite(event.alpha)) {
    // alpha increases counterclockwise; a compass bearing increases clockwise.
    return {
      heading: wrap(360 - event.alpha),
      source: event.absolute ? 'compass' : 'rotation',
      priority: event.absolute ? 2 : 1,
    };
  }
  return null;
}

export async function requestOrientationAccess(target) {
  if (!target.isSecureContext) return 'insecure';
  if (!target.DeviceOrientationEvent) return 'unavailable';
  if (typeof target.DeviceOrientationEvent.requestPermission !== 'function') return 'granted';
  // Called directly from the tap handler, while user activation is still present.
  return target.DeviceOrientationEvent.requestPermission(true);
}

export function watchHeading(target, { onReading, onRotate }) {
  let previous = null;
  let priority = 0;
  const orient = event => {
    const reading = readHeading(event);
    if (!reading || reading.priority < priority) return;
    onReading(reading);
    // Different orientation streams can have different reference directions.
    if (previous === null || reading.priority > priority) {
      previous = reading.heading;
      priority = reading.priority;
      return;
    }
    const delta = wrap(reading.heading - previous + 180) - 180;
    // Ignore stationary sensor noise, but accumulate slow intentional turns.
    if (Math.abs(delta) < 0.6) return;
    previous = reading.heading;
    onRotate(delta);
  };
  const rebase = () => { previous = null; };
  target.addEventListener('deviceorientation', orient);
  target.addEventListener('deviceorientationabsolute', orient);
  target.addEventListener('orientationchange', rebase);
  target.addEventListener('pageshow', rebase);
  return () => {
    target.removeEventListener('deviceorientation', orient);
    target.removeEventListener('deviceorientationabsolute', orient);
    target.removeEventListener('orientationchange', rebase);
    target.removeEventListener('pageshow', rebase);
  };
}
