(function(root, factory) {
  var registry = factory();
  if (typeof module === 'object' && module.exports) module.exports = registry;
  root.DIVIDEND_INDEX_REGISTRY = registry;
  root.DIVIDEND_DEFAULT_INDEX = "930955";
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  return Object.freeze([
    Object.freeze({"code":"000922","name":"中证红利指数","apiCode":"000922","enabled":true}),
    Object.freeze({"code":"930955","name":"红利低波100指数","apiCode":"930955","enabled":true})
  ]);
});
