import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { HyperionPlatformAccessory } from './HyperionPlatformAccessory';
import EffectCharacteristic from './characteristic/EffectCharacteristic';
import { IHyperionJubConfig } from './interfaces/HyperionJubConfig';

let IEffectCharacteristic;

export class HyperionHomebridgePlatform implements DynamicPlatformPlugin {
  private EffectCharacteristic;

  public readonly Service: typeof Service = this.api.hap.Service;
  // public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic & typeof EffectCharacteristic;
  public Characteristic: typeof Characteristic & typeof IEffectCharacteristic;



  readonly uuid = '769518a6-5220-4a81-9ef4-d6eac26d8730';

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  public readonly hyperionConfig: IHyperionJubConfig;


  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {

    this.hyperionConfig = this.validateConfig(this.config, this.log);

    if (this.hyperionConfig === null) {
      this.log.error('Please fix any configuration errors before continuing. Plugin will not continue');
      return;
    }

    this.log.debug('Finished initializing platform:', this.config.name);

    // run the method to discover / register your devices as accessories
    this.api.on('didFinishLaunching', () => {
      this.discoverDevices(config, log);
    });

    this.EffectCharacteristic = EffectCharacteristic(this.api, this.hyperionConfig.effects);
    IEffectCharacteristic = this.EffectCharacteristic;

    // Extends Characteristic for hap with custom EffectCharacteristic.
    this.Characteristic = Object.defineProperty(
      this.api.hap.Characteristic,
      'EffectCharacteristic',
      { value: this.EffectCharacteristic },
    );

  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.debug('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  discoverDevices(config, log) {
    const existingAccessory = this.accessories.find(accessory => accessory.UUID === this.uuid);

    if (existingAccessory) {
      log.debug('Restoring existing accessory from cache:', existingAccessory.displayName);
      new HyperionPlatformAccessory(this, existingAccessory);
      return;
    }


    // the accessory does not yet exist, so we need to create it
    log.info('Adding new accessory:', config.name);

    // create a new accessory
    const accessory = new this.api.platformAccessory(config.name, this.uuid);

    // store a copy of the device object in the `accessory.context`
    // the `context` property can be used to store any data about the accessory you may need
    accessory.context.device = {
      name: config.name,
      uuid: this.uuid,
    };

    new HyperionPlatformAccessory(this, accessory);

    // link the accessory to your platform
    this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
  }

  validateConfig(config, log: Logger): IHyperionJubConfig {

    ['platform', 'url'].forEach((required: string) => {

      if (!config[required]) {
        log.error(`Please configure ${PLATFORM_NAME} correctly. Missing key '${required}'`);
        return null;
      }

    });

    return {
      platform: config.platform, // Required by the user
      url: config.url, // Required by the user
      name: config.name ?? 'TV backlight',
      port: config.port ?? 8090,
      priority: config.priority ?? 50,
      token: config.token ?? '',
      effects: config.effects as Array<string> ?? [],
    };
  }


}
