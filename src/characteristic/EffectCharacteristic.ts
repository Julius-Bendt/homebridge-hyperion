import { Formats, Perms, CharacteristicProps } from 'homebridge';

// See https://github.com/homebridge/homebridge-plugin-template/issues/20 for more information
export = (homebridge, effects: Array<String>) => {
  const Charact = homebridge.hap.Characteristic;

  return class EffectCharacteristic extends Charact {
    public static readonly UUID: string = 'f8d871fa-a67a-43fe-872d-5250f055d17c';
    constructor() {

      const options: CharacteristicProps = {
        format: Formats.UINT16,
        unit: ' effect',
        minValue: 0,
        maxValue: effects.length,
        minStep: 1,
        perms: [Perms.PAIRED_READ, Perms.PAIRED_WRITE, Perms.EVENTS],
      }

      super('Effect', EffectCharacteristic.UUID, options);
      this.value = 0;
    }
  };
};