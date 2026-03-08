import { classify, basename } from '@utils/util'

export function getName({ name, file }) {
  if (name) {
    return name
  }
  if (file) {
    return classify(basename(file, '.vue'))
  }
}
