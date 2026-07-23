# Modu Brain Korean Sans font notice

The WOFF files in this directory are derivative builds of the official
KoPubWorld Dotum_Pro OTF fonts distributed by the Korea Publishers Society
(KOPUS). The source archive used for this build was
`KOPUBWORLD_OTF_FONTS2026.zip`.

On 2026-07-13, FontTools 4.63.0 converted the OTF files to WOFF and changed
their internal family name to `Modu Brain Korean Sans`. The outlines and
character coverage were not subset or otherwise altered. The renamed family
prevents the derivative files from presenting themselves as an official
KoPub/KoPubWorld release.

These files remain subject to [the KoPub/KoPubWorld license](LICENSE-KOPUBWORLD.md).
Keep that license with every copy or redistribution. The fonts must not be sold
as standalone software.

Rebuild command:

```powershell
python scripts/ops/build-kopub-fonts.py <official-otf-directory> public/fonts
```
