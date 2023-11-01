import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import Color from 'Color';

import { HyperionHomebridgePlatform } from './HyperionHomebridgePlatform';
import { createAxios } from './services/http';

export class HyperionPlatformAccessory {
  private service: Service;

  private readonly axios;

  private states = {
    on: false,
    brightness: 100,
    effectIndex: 0,
    enabled: false,
    saturation: 0,
    hue: 0,
    color: Color([255, 200, 150]),
  };

  constructor(
    private readonly platform: HyperionHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // Setup axios, which will comunicate with Hyperion
    const url = `${this.platform.config.url}:${this.platform.config.port}/json-rpc`;
    this.axios = createAxios(url, this.platform.config.token ?? "", this.platform.log);

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'JUB')
      .setCharacteristic(this.platform.Characteristic.Model, 'HomeBridge to hyperion')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');


    this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.platform.config.name as string);

    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.Brightness)
      .onSet(this.setBrightness.bind(this))
      .onGet(this.getBrightness.bind(this));


    this.service.getCharacteristic(this.platform.Characteristic.Hue)
      .onSet(this.setHue.bind(this))
      .onGet(this.getHue.bind(this));


    this.service.getCharacteristic(this.platform.Characteristic.Saturation)
      .onSet(this.setSaturation.bind(this))
      .onGet(this.getSaturation.bind(this));

    if (this.platform.effects.length > 0) {
      this.service.getCharacteristic(this.platform.Characteristic.EffectCharacteristic)
        .onGet(this.getEffect.bind(this))
        .onSet(this.setEffect.bind(this));
    }
  }


  async setOn(value: CharacteristicValue) {
    this.states.on = value as boolean;

    this.platform.log.info('Set Characteristic On ->', value);

    if (!this.states.on) {
      this.sendClearRequest();
    } else {
      this.setSaturation(this.states.saturation);
    }


    this.service
      .getCharacteristic(this.platform.Characteristic.On)
      .updateValue(this.states.on);
  }

  async getOn(): Promise<CharacteristicValue> {
    const isOn = this.states.on;

    this.platform.log.debug('Get Characteristic On ->', isOn);

    return isOn;
  }

  async setBrightness(value: CharacteristicValue) {
    this.states.brightness = value as number;

    const { data } = await this.axios.post('/json-rpc', {
      command: 'adjustment',
      adjustment: {
        brightness: value,
      },
    });

    this.platform.log.info('Set Characteristic Brightness -> ', value, data);

    this.service
      .getCharacteristic(this.platform.Characteristic.Brightness)
      .updateValue(value);
  }

  async getBrightness(): Promise<CharacteristicValue> {
    const brightness = this.states.brightness;

    this.platform.log.debug('Getting brightness ->', brightness);

    return brightness;
  }

  async setHue(value: CharacteristicValue) {
    const newHue = Color(this.states.color).hue(value);
    this.states.color = newHue;

    this.platform.log.info(`Set Characteristic hue ->  ${newHue}`);

    this.service
      .getCharacteristic(this.platform.Characteristic.Hue)
      .updateValue(value);
  }

  async getHue(): Promise<CharacteristicValue> {
    return this.states.color.hue();
  }

  async setSaturation(value: CharacteristicValue) {
    this.states.saturation = (value ?? this.states.saturation) as number;
    const newColor = Color(this.states.color).saturationv(value);


    this.platform.log.info('Set Characteristic saturation -> ', this.states.saturation,
      newColor
        .rgb()
        .round()
        .array(),
    );


    const { data } = await this.axios.post('/json-rpc', {
      command: 'color',
      priority: this.platform.config.priority,
      color: newColor.rgb().round().array(),
    });

    if (!data.success) {
      this.platform.log.error(`Failed to set the saturation to: ${value}`);
      return;
    }

    this.states.color.hue(newColor.hue());
  }

  async getSaturation(value: CharacteristicValue): Promise<CharacteristicValue> {
    this.states.saturation = (value ?? this.states.saturation) as number;

    this.platform.log.debug('Set Characteristic saturation -> ', this.states.hue);

    return this.states.saturation;
  }

  async setEffect(value: CharacteristicValue) {
    this.states.effectIndex = (value ?? this.states.effectIndex) as number;
    const effectName = this.platform.effects[this.states.effectIndex] ?? 'none';
    this.platform.log.info('Set Characteristic effect -> ', this.states.effectIndex, effectName);

    let effectData = {
      success: false,
    };

    if (effectName.toLowerCase() === 'none') {
      effectData = await this.sendClearRequest();
      return;
    }

    const { data } = await this.axios.post('/json-rpc', {
      command: 'effect',
      effect: {
        name: effectName,
      },
      priority: 50,
      origin: 'My Fancy App',
    });
    effectData = data;

    if (!effectData.success) {
      this.platform.log.error(`Failed to change the effect to: ${effectName}`, effectData);
      return;
    }
  }

  async getEffect(): Promise<CharacteristicValue> {
    this.platform.log.debug('get Characteristic effect -> ', this.states.effectIndex);
    return this.states.effectIndex;
  }

  async sendClearRequest() {
    this.platform.log.debug('Sending clear request...');

    const { data } = await this.axios.post('/json-rpc', {
      command: 'clear',
      priority: this.platform.config.priority,
    });

    return data.data;
  }
}
