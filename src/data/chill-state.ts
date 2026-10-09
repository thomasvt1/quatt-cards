import type { QuattDevice } from '../types';

/** Mode is a setting; it never establishes whether the unit is running. */
export function chillState(device: QuattDevice) {
  const status = device.metrics.status?.text?.trim();
  const mode = device.metrics.mode?.text?.trim();
  const normalizedStatus = status?.toLowerCase();
  const normalizedMode = mode?.toLowerCase();
  const offline = !device.available || normalizedStatus === 'offline';
  const state = offline ? 'offline'
    : normalizedStatus === 'off' ? 'off'
    : ['idle', 'standby'].includes(normalizedStatus || '') ? 'idle'
    : ['on', 'running', 'cooling', 'heating'].includes(normalizedStatus || '') ? 'on' : 'unknown';
  const setting = ['cool', 'cooling'].includes(normalizedMode || '') ? 'cooling'
    : ['heat', 'heating'].includes(normalizedMode || '') ? 'heating' : 'neutral';
  return {
    state, setting,
    statusText: offline ? 'Unavailable' : status || 'Status unavailable',
    modeText: mode || 'Mode unavailable',
    statusIcon: state === 'offline' ? 'warning' : state === 'off' ? 'power'
      : state === 'idle' ? 'clock' : state === 'on' ? 'tick' : 'question',
    modeIcon: setting === 'cooling' ? 'snow' : setting === 'heating' ? 'heat' : 'question',
  };
}
