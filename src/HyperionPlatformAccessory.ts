import { Service, PlatformAccessory, CharacteristicValue, Logger } from 'homebridge';
import Color from "Color";

import { HyperionHomebridgePlatform } from './HyperionHomebridgePlatform';
import { createAxios } from './services/http';
import EffectCharacteristic from './characteristic/EffectCharacteristic';


/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class HyperionPlatformAccessory {
  private service: Service;

  private readonly axios;

  private states = {
    on: false,
    brightness: 100,
    effect: "none",
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
    const url = `${ this.platform.config.url}:${ this.platform.config.port}/json-rpc`;
    this.axios = createAxios(url,  this.platform.config.token,  this.platform.log);

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'JUB')
      .setCharacteristic(this.platform.Characteristic.Model, 'HomeBridge to hyperion')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');


    this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.platform.config.name as string );

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

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
    
    this.service.getCharacteristic(this.platform.Characteristic.EffectCharacteristic)
      .onGet(this.getEffect.bind(this))
      .onSet(this.setEffect.bind(this));
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setOn(value: CharacteristicValue) {
    // implement your own code to turn your device on/off
    this.states.on = value as boolean;

    this.platform.log.info('Set Characteristic On ->', value);

    if (!this.states.on)
    {
      const { data } = await this.axios.post("/json-rpc", {
        command: "clear",
        priority: this.platform.config.priority,
      });
    }
    else {
      this.setSaturation(this.states.saturation);
    }


    this.service
      .getCharacteristic(this.platform.Characteristic.On)
      .updateValue(this.states.on);
  }

  async getOn(): Promise<CharacteristicValue> {
    // implement your own code to check if the device is on
    const isOn = this.states.on;

    this.platform.log.info('Get Characteristic On ->', isOn);

    return isOn;
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, changing the Brightness
   */
  async setBrightness(value: CharacteristicValue) {
    this.states.brightness = value as number;

    const { data } = await this.axios.post("/json-rpc", {
          command: "adjustment",
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
    // implement your own code to check if the device is on
    const brightness = this.states.brightness;

    this.platform.log.info('Getting brightness ->', brightness);

    return brightness;
  }

  async setHue(value: CharacteristicValue) {
    const newHue = Color(this.states.color).hue(value);
    this.states.color = newHue;

    this.platform.log.info(`Setting hue to: ${value}`, newHue)

    this.service
      .getCharacteristic(this.platform.Characteristic.Hue)
      .updateValue(value);
  }

    async getHue(): Promise<CharacteristicValue> {
        return this.states.color.hue();
    }

  async setSaturation(value: CharacteristicValue) {
    // implement your own code to set the brightness
    this.states.saturation = (value ?? this.states.saturation) as number

    this.platform.log.info('Set Characteristic saturation -> ', this.states.saturation);

    const newColor = Color(this.states.color).saturationv(value);

    this.platform.log.info(`Setting saturation to: ${value}`);

    const { data } = await this.axios.post("/json-rpc", {
      command: "color",
      priority: this.platform.config.priority,
      color: newColor.rgb().round().array(),
    });

    if (!data.success) {
      this.platform.log.error(`Failed to set the saturation to: ${value}`);
      return;
    }

    this.platform.log.info(
      `Successfully set the saturation. New color ${newColor
        .rgb()
        .round()
        .array()}`
    );
    this.states.color.hue(newColor.hue());
  }

  async getSaturation(value: CharacteristicValue): Promise<CharacteristicValue> {
    this.states.saturation = (value ?? this.states.saturation) as number

    this.platform.log.info('Set Characteristic saturation -> ', this.states.hue);

    // return this.states.saturation;
    return 0;
  }

  async setEffect(value: CharacteristicValue) {
    this.states.effect = (value ?? this.states.saturation) as string

    this.platform.log.info('Set Characteristic effect -> ', this.states.effect);

    // const newColor = Color(this.states.color).saturationv(value);

    // this.platform.log.info(`Setting saturation to: ${value}`);

    // const { data } = await this.axios.post("/json-rpc", {
    //   command: "color",
    //   priority: this.platform.config.priority,
    //   color: newColor.rgb().round().array(),
    // });

    // if (!data.success) {
    //   this.platform.log.error(`Failed to set the saturation to: ${value}`);
    //   return;
    // }

    // this.platform.log.info(
    //   `Successfully set the saturation. New color ${newColor
    //     .rgb()
    //     .round()
    //     .array()}`
    // );
    // this.states.color.hue(newColor.hue());
  }

  async getEffect(value: CharacteristicValue): Promise<CharacteristicValue> {
    this.states.effect = (value ?? this.states.effect) as string

    this.platform.log.info('Set Characteristic effect -> ', this.states.effect);

    // return this.states.saturation;
    return 0;
  }

}
