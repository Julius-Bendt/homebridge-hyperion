import { Formats, Perms, CharacteristicProps } from 'homebridge';

export = (homebridge, effects) => {
  const Charact = homebridge.hap.Characteristic;

  return class EffectCharacteristic extends Charact {
    public static readonly UUID: string = 'f8d871fa-a67a-43fe-872d-5250f055d17c';
      constructor() {
          
        const options: CharacteristicProps = {
            format: Formats.ARRAY,
            unit: '',
            validValues: [0,1,2,3,4,5,6,7],
            perms: [Perms.PAIRED_READ, Perms.NOTIFY],
        }
        
        super('Effect', EffectCharacteristic.UUID, options);
        this.value = 0;
    }
  };
};