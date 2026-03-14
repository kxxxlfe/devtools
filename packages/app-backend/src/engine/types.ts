type BoolFunc = (instance: any) => boolean

export type VueEngine = {
  uid: (instance: any) => any
  getInstanceName: (instance: any) => string
  getOptionName: (instance: any) => string
  children: (instance: any) => any[]
  file: (instance: any) => string | null
  isDestroyed: BoolFunc
  isFragment: BoolFunc
  isComponentInstance: BoolFunc
  isVNode: BoolFunc
  _: {
    el: (instance: any) => Element
    data: (instance: any) => any
    pureData: (instance: any) => any
    props: (instance: any) => any
    attrs: (instance: any) => any
    refs: (instance: any) => Record<string, any>
    setupState: (instance: any) => Record<string, any>
    inject: (instance: any) => any
    route: (instance: any) => any
    pinia: (instance: any) => any
  }
  functional?: any
  [key: string]: any
}
