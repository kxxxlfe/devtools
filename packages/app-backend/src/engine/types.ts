export type VueEngine = {
  uid: (instance: any) => any
  getInstanceName: (instance: any) => string
  children: (instance: any) => any[]
  isDestroyed: (instance: any) => boolean
  isFragment: (instance: any) => boolean
  functional?: any
  [key: string]: any
}
