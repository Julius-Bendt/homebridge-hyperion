import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import Color, { hsl } from 'color';

import { HyperionHomebridgePlatform } from './HyperionHomebridgePlatform';
import { createAxios } from './services/http';

export class HyperionPlatformAccessory {
  private service: Service;

  private readonly axios;

  private states = {
    on: false,
    brightness: 75,
    effectIndex: 0,
    enabled: false,
    saturation: 70,
    hue: hsl(33, 100, 79.4),
    color: Color([255, 200, 150]),
  };

  constructor(
    private readonly platform: HyperionHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // Setup axios, which will communicate with Hyperion
    const url = `${this.platform.hyperionConfig.url}:${this.platform.hyperionConfig.port}/json-rpc`;
    this.axios = createAxios(url, this.platform.hyperionConfig.token, this.platform.log);

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'JUB')
      .setCharacteristic(this.platform.Characteristic.Model, 'HomeBridge to hyperion')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');


    this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.platform.hyperionConfig.name);

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

    if (this.platform.hyperionConfig.effects.length > 0) {
      this.service.getCharacteristic(this.platform.Characteristic.EffectCharacteristic)
        .onGet(this.getEffect.bind(this))
        .onSet(this.setEffect.bind(this));
    }
  }


  async setOn(value: CharacteristicValue) {
    this.states.on = value as boolean;

    this.platform.log.info('Set Characteristic On ->', value);

    if (!this.states.on) {
      this.sendRequest(
        {
          command: 'clear',
          priority: this.platform.hyperionConfig.priority,
        },
        'on',
        false,
      );

    } else {
      this.setSaturation(this.states.saturation); // Change color to default value
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

    // If brightness is turned to 0, turn off the lightbulb instead of setting brightness
    if (this.states.brightness === 0) {
      this.platform.log.debug(`Turning ${this.platform.hyperionConfig.name} off instead of changing brightness.
      As changing the brightness will also affect hyperion backlightning effect outside homekit`);
      return;
    }

    const success = await this.sendRequest(
      {
        command: 'adjustment',
        adjustment: {
          brightness: value,
        },
      },
      'brightness',
      value,
    );

    if (success) {
      this.service
        .getCharacteristic(this.platform.Characteristic.Brightness)
        .updateValue(value);
    }


  }

  async getBrightness(): Promise<CharacteristicValue> {
    const brightness = this.states.brightness;

    this.platform.log.debug('Getting brightness ->', brightness);

    return brightness;
  }

  async setHue(value: CharacteristicValue) {

    const newHue = Color(this.states.color).hue(value as number);
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
    const newColor = Color(this.states.color).saturationv(value as number);


    const success = await this.sendRequest(
      {
        command: 'color',
        priority: this.platform.hyperionConfig.priority,
        color: newColor.rgb().round().array(),
      },
      'color',
      newColor.rgb().round().array(),
    );

    if (success) {
      this.states.color.hue(newColor.hue());
    }
  }

  async getSaturation(value: CharacteristicValue): Promise<CharacteristicValue> {
    this.states.saturation = (value ?? this.states.saturation) as number;

    this.platform.log.debug('Set Characteristic saturation -> ', this.states.hue);

    return this.states.saturation;
  }

  async setEffect(value: CharacteristicValue) {
    this.states.effectIndex = (value ?? this.states.effectIndex) as number;
    const effectName = this.platform.hyperionConfig.effects[this.states.effectIndex] ?? 'none';
    this.platform.log.info('Set Characteristic effect -> ', this.states.effectIndex, effectName);

    if (effectName.toLowerCase() === 'none') {
      const color = Color(this.states.color).saturationv(value as number);

      const success = await this.sendRequest(
        {
          command: 'color',
          priority: this.platform.hyperionConfig.priority,
          color: color.rgb().round().array(),
        },
        'color',
        color.rgb().round().array(),
      );

      if (success) {
        this.states.color = color;
        this.platform.log.debug(`Changing from effect to color mode. Turn of the ${this.platform.hyperionConfig.name} Lightbulb 
      in order to change back to default Hyperion mode`);
      } else {
        this.platform.log.error('Failed to change from effect to color mode');
      }

      return;
    }


    const success = await this.sendRequest(
      {
        command: 'effect',
        effect: {
          name: effectName,
        },
        priority: 50,
        origin: 'My Fancy App',
      },
      'effect',
      value,
      effectName,
    );

    if (success) {
      this.service
        .getCharacteristic(this.platform.Characteristic.EffectCharacteristic)
        .updateValue(value);
    }


  }

  async getEffect(): Promise<CharacteristicValue> {
    this.platform.log.debug('get Characteristic effect -> ', this.states.effectIndex);
    return this.states.effectIndex;
  }

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  async sendRequest(body, name, value, ...parameters: any[]): Promise<boolean> {
    const { data } = await this.axios.post('/json-rpc', body);


    if (!data.success) {
      this.platform.log.error(`Failed to change the ${name} to: ${value}`, data);
      return false;
    }

    this.platform.log.info('Set Characteristic ${name} -> ', value, ...parameters);
    return true;
  }
}
