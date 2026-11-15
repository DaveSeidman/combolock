import test from 'node:test';
import assert from 'node:assert/strict';
import {readHeading, requestOrientationAccess, watchHeading} from '../src/orientation.mjs';

function phone() {
  const target = new EventTarget();
  const readings = [], turns = [];
  const stop = watchHeading(target, {
    onReading: reading => readings.push(reading),
    onRotate: delta => turns.push(delta),
  });
  const emit = (values, type = 'deviceorientation') => {
    target.dispatchEvent(Object.assign(new Event(type), values));
  };
  return {target,readings,turns,stop,emit};
}

test('iPhone compass turns across north in both directions without full-turn jumps', () => {
  const p = phone();
  [350, 355, 0, 5, 0, 355].forEach(webkitCompassHeading => p.emit({webkitCompassHeading,gamma:0}));
  assert.deepEqual(p.turns,[5,5,5,-5,-5]);
  assert.equal(p.readings.at(-1).source,'compass');
});

test('Android alpha rotates clockwise with decreasing alpha, including multiple full revolutions', () => {
  const p = phone();
  for(let step=0;step<=80;step++)p.emit({alpha:(360-step*9%360)%360,absolute:true,gamma:0},'deviceorientationabsolute');
  assert.equal(p.turns.length,80);
  assert.equal(p.turns.reduce((sum,delta)=>sum+delta,0),720);
});

test('relative rotation works without a compass, and sideways tilt alone does not turn the lock', () => {
  const p = phone();
  p.emit({alpha:100,gamma:0});
  p.emit({alpha:100,gamma:50});
  assert.deepEqual(p.turns,[]);
  p.emit({alpha:91,gamma:50});
  assert.deepEqual(p.turns,[9]);
  assert.equal(p.readings.at(-1).source,'rotation');
});

test('stationary events leave the stop timer alone while slow turns accumulate', () => {
  const p = phone();
  [10,10.1,9.9,10,10.2,10.4].forEach(webkitCompassHeading=>p.emit({webkitCompassHeading}));
  assert.equal(p.turns.length,0);
  p.emit({webkitCompassHeading:10.8});
  assert.ok(Math.abs(p.turns[0]-0.8)<1e-9);
});

test('switching to an absolute compass rebases without moving, and ignores relative events afterwards', () => {
  const p = phone();
  p.emit({alpha:100});
  p.emit({alpha:0,absolute:true},'deviceorientationabsolute');
  p.emit({alpha:90});
  assert.deepEqual(p.turns,[]);
  p.emit({alpha:351,absolute:true},'deviceorientationabsolute');
  assert.deepEqual(p.turns,[9]);
  p.stop();
  p.emit({alpha:342,absolute:true},'deviceorientationabsolute');
  assert.deepEqual(p.turns,[9]);
});

test('invalid data never becomes a false north heading', () => {
  assert.equal(readHeading({alpha:null,gamma:30}),null);
  assert.equal(readHeading({alpha:NaN,webkitCompassHeading:-1}),null);
  assert.equal(readHeading({webkitCompassHeading:0}).heading,0);
});

test('orientation changes rebase instead of making the dial jump', () => {
  const p = phone();
  p.emit({webkitCompassHeading:10});
  p.target.dispatchEvent(new Event('orientationchange'));
  p.emit({webkitCompassHeading:100});
  assert.deepEqual(p.turns,[]);
  p.emit({webkitCompassHeading:110});
  assert.deepEqual(p.turns,[10]);
});

test('requests compass permission directly and preserves denial and failures', async () => {
  let requested=false;
  const target={isSecureContext:true,DeviceOrientationEvent:{requestPermission(absolute){requested=absolute;return Promise.resolve('denied')}}};
  const pending=requestOrientationAccess(target);
  assert.equal(requested,true);
  assert.equal(await pending,'denied');
  target.DeviceOrientationEvent.requestPermission=()=>Promise.reject(new Error('blocked'));
  await assert.rejects(requestOrientationAccess(target),/blocked/);
  assert.equal(await requestOrientationAccess({isSecureContext:false}),'insecure');
  assert.equal(await requestOrientationAccess({isSecureContext:true}),'unavailable');
  assert.equal(await requestOrientationAccess({isSecureContext:true,DeviceOrientationEvent:{}}),'granted');
});
