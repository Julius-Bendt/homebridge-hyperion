import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { HyperionPlatformAccessory } from './HyperionPlatformAccessory';
import EffectCharacteristic from './characteristic/EffectCharacteristic';

let IEffectCharacteristic;

export class HyperionHomebridgePlatform implements DynamicPlatformPlugin {
  private EffectCharacteristic;

  public readonly Service: typeof Service = this.api.hap.Service;
  // public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic & typeof EffectCharacteristic;
  public Characteristic: typeof Characteristic & typeof IEffectCharacteristic;

  

  readonly uuid = "769518a6-5220-4a81-9ef4-d6eac26d8730";

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  private readonly axios;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);

    this.log.info("Loaded effects:", config.effects);
    this.EffectCharacteristic = EffectCharacteristic(this.api, config.effects);
    IEffectCharacteristic = this.EffectCharacteristic;

    // run the method to discover / register your devices as accessories
    this.api.on('didFinishLaunching', () => {
      this.discoverDevices(config, log);
    });

    // Extends Characteristic for hap with custom EffectCharacteristic.
    this.Characteristic = Object.defineProperty(this.api.hap.Characteristic, 'EffectCharacteristic', {value: this.EffectCharacteristic});
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  discoverDevices(config, log) {


      // generate a unique id for the accessory this should be generated from
      // something globally unique, but constant, for example, the device serial
      // number or MAC address

      // see if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === this.uuid);

      if (existingAccessory) {
        // the accessory already exists
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

        // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
        // existingAccessory.context.device = device;
        // this.api.updatePlatformAccessories([existingAccessory]);

        // create the accessory handler for the restored accessory
        // this is imported from `platformAccessory.ts`
        new HyperionPlatformAccessory(this, existingAccessory);

        // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, eg.:
        // remove platform accessories when no longer present
        // this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
        // this.log.info('Removing existing accessory from cache:', existingAccessory.displayName);
        return;
    } 
    

        // the accessory does not yet exist, so we need to create it
        this.log.info('Adding new accessory:', config.name);

        // create a new accessory
        const accessory = new this.api.platformAccessory(config.name, this.uuid);

        // store a copy of the device object in the `accessory.context`
        // the `context` property can be used to store any data about the accessory you may need
        accessory.context.device = {
          name: config.name,
          uuid:this.uuid,
        };

        // create the accessory handler for the newly create accessory
        // this is imported from `platformAccessory.ts`
        new HyperionPlatformAccessory(this, accessory);

        // link the accessory to your platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
  }
}
