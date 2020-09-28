import VueTutorial from '@/components/VueTutorial';

const install = (Vue) => {
  Vue.component(VueTutorial.name, VueTutorial);
};

if (typeof window !== 'undefined' && window.Vue) {
  install(window.Vue);
}

export {
  VueTutorial,
  install,
};

export default {
  VueTutorial,
  install,
};
