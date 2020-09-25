import Tutorial from '@/components/Tutorial';

const install = (Vue) => {
  Vue.component(Tutorial.name, Tutorial);
};

if (typeof window !== 'undefined' && window.Vue) {
  install(window.Vue);
}

export {
  Tutorial,
};

export default install;
