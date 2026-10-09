import type { QuattDevice } from '../types';

const normalize = (value?:string|null) => value?.trim().toLowerCase().replace(/[_\s]+/g, ' ');

/** Connectivity diagnostics override cached readings and native control access. */
export function chillDisconnected(status?:string|null):boolean {
  return ['offline','warning disconnected'].includes(normalize(status) || '');
}

/** Mode is a setting; it never establishes whether the unit is running. */
export function chillState(device: QuattDevice) {
  const status = device.metrics.status?.text?.trim();
  const mode = device.metrics.mode?.text?.trim();
  // HA formats API enums as sentence case; accept both exact forms.
  // Do not treat every unknown on-prefixed state as confirmed activity.
  const normalizedStatus = normalize(status);
  const normalizedMode = normalize(mode);
  const offline = !device.available || chillDisconnected(status);
  const diagnostic = /^(warning|error|fault)(?: |$)/.test(normalizedStatus || '');
  const state = offline ? 'offline'
    : diagnostic ? 'warning'
    : normalizedStatus === 'off' ? 'off'
    : ['idle', 'standby', 'on idle', 'on standby', 'on target temperature reached'].includes(normalizedStatus || '') ? 'idle'
    : ['on', 'on working', 'running', 'cooling', 'heating'].includes(normalizedStatus || '') ? 'on' : 'unknown';
  const setting = ['cool', 'cooling'].includes(normalizedMode || '') ? 'cooling'
    : ['heat', 'heating'].includes(normalizedMode || '') ? 'heating' : 'neutral';
  const activity = state === 'on' ? normalizedStatus === 'cooling' ? 'cooling' : normalizedStatus === 'heating' ? 'heating' : setting : 'neutral';
  return {
    activity,
    activityIcon: state === 'off' || state === 'idle' ? 'power' : state === 'offline' || state === 'warning' ? 'warning' : state === 'unknown' ? 'question' : activity === 'cooling' ? 'snow' : activity === 'heating' ? 'heat' : 'tick',
    state, setting,
    statusText: offline && !diagnostic ? 'Unavailable' : status || 'Status unavailable',
    modeText: mode || 'Mode unavailable',
    statusIcon: state === 'offline' || state === 'warning' ? 'warning' : state === 'off' ? 'power'
      : state === 'idle' ? 'power' : state === 'on' ? 'tick' : 'question',
    modeIcon: setting === 'cooling' ? 'snow' : setting === 'heating' ? 'heat' : 'question',
  };
}
