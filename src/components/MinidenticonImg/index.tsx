import { minidenticon } from 'minidenticons'
import { useMemo, ImgHTMLAttributes } from 'react'

export type MinidenticonImgProps = ImgHTMLAttributes<HTMLImageElement> & {
  username: string
  saturation?: number | string
  lightness?: number | string
}

export const MinidenticonImg = ({
  username,
  saturation,
  lightness,
  ...props
}: MinidenticonImgProps) => {
  const svgURI = useMemo(
    () =>
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(minidenticon(username, saturation, lightness)),
    [username, saturation, lightness]
  )
  return <img alt={username} src={svgURI} {...props} />
}
