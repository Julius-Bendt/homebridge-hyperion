# A hyperion homebridge plugin

Setting up hyperion to work with homebridge using existing solutions felt somewhat lacking, therefore, I created a new plugin!

## Installing

Using the homebridge web UI, or:

```
npm i -g homebridge-hyperion-jub
```

## This plugin supports:

- On/Off
- Brightness
- Color
- Hue
- Saturation
- Effects

Some of these may require the Eve- or home+ app.

[Home+](https://apps.apple.com/us/app/home-6/id995994352)
[Eve app](https://apps.apple.com/us/app/eve-for-matter-homekit/id917695792) (Untested)

These links are not affiliated. Other apps may work, the apple home app doesnt support custom characteristics, but base modifications should work.

A big thanks to [cortl](https://github.com/cortl/homebridge-hyperion-service) for creating a plugin in the first place - the knowledge from his repository definitely helped me create this plugin

## Configuration

```json
{
  "platform": "HyperionJub",
  "name": "TV backlight",
  "url": "http://{IP OR URL FACING HYPERION}",
  "port": "8090",
  "token": "Token from hyperion",
  "priority": 50,
  "effects": [
    "none",
    "Atomic swirl",
    "Blue mood blobs",
    "Breath",
    "Candle",
    "Cinema brighten lights",
    "Cinema dim lights",
    "Cold mood blobs",
    "Collision",
    "Color traces",
    "Double swirl",
    "Fire",
    "Flags Germany/Sweden",
    "Full color mood blobs",
    "Green mood blobs",
    "Knight rider",
    "Led Test",
    "Led Test - Sequence",
    "Light clock",
    "Lights",
    "Matrix",
    "Notify blue",
    "Pac-Man",
    "Plasma",
    "Police Lights Single",
    "Police Lights Solid",
    "Rainbow mood",
    "Rainbow swirl",
    "Rainbow swirl fast",
    "Random",
    "Red mood blobs",
    "Sea waves",
    "Snake",
    "Sparks",
    "Strobe red",
    "Strobe white",
    "System Shutdown",
    "Trails",
    "Trails color",
    "Warm mood blobs",
    "Waves with Color",
    "X-Mas"
  ]
}
```

- `platform` **required**: must always be "HyperionJub"
- `name` optional: display name of your device (default: TV backlight)
- `url` **required**: IP/URL of your hyperion instance. Remember to configure your router to give your device a static ip.
- `port` **required**: port of your hyperion webserver (default: 8090)
- `token` optional: authorization token (see hyperion network configuration)
- `priority` optional: allows you to change the called priority to Hyperion (lowest priority overrides higher priority).
- `effects` optional: Allows you to start effects available in hyperion. Due to limitations of the home app, these effect will be shown as numbers, and also requires one of the above apps. You may at any time reorder, remove or add the effects, though.

## Controlling effects

The actual configuration of effects should be done using the hyperion webinterface. The list of characteristics would simply be way to big, if I had to implement every parameter available.

Made with :heart: in Aalborg, Denmark
