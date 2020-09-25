<template>
  <div id="app">
    <test-tutorial />
  </div>
</template>

<script>
import TestTutorial from './components/TestTutorial';

export default {
  name: 'App',
  components: {
    TestTutorial,
  },
};
</script>

<style lang="scss">
html, body {
  padding: 0;
  margin: 0;
}
</style>
