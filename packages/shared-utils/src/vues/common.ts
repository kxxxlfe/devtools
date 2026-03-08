// 区分 Vue 1，2，3
export const getVerNum = function (version: string) {
  return +version?.split('.')[0]
}
