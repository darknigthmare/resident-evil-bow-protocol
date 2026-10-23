For some models, the texture includes multiple variants, which can be controlled by editing the UVs.

em34 - Nemesis
em35 - Nemesis (rocket launcher exploded, burnt upper body)
em36 - Nemesis (fully exposed upper body)
em37 - Tentacle
em3a - Nemesis (fully exposed upper body)
em3b - Tentacle (not included, same model/texture as em37)

Models named _0 include the enemy with default hands. Models named _1 include only the alternate hands at the origin. Models named _2 include the enemy with the alternate hands in place of the default hands.

For model em3a, the tim2view texture does not include transparency, while the emdui version does. Raw data color conversion is handled differently by emdui versus tim2view, in this case leading to differences in the range of pixels that are interpreted as black 0,0,0. While the texture for em36 is visually similar to em3a, it uses a different color range, and both emdui and tim2view output the same transparency. Textures that use transparency are provided both with and without black transparency enabled for the tim2view version.

Files are provided from the emd game folder. The emd08 folder (Carlos player segment) contains identical files, except it does not include em35.

Files labeled emdui were exported using emdui (emd UI) by IntelOrca.
Files labeled tim2view were exported using tim2view by Lab 313.