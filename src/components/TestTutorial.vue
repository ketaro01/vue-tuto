<template>
  <div class="main-box">
    <div class="box">
      <div
        v-for="(item, i) in items"
        :key="i"
      >
        <div
          :class="`box-item-${i}`"
          :style="item.style"
        >
          {{ item.word }}
        </div>
      </div>
    </div>
    <tutorial
      :steps="steps"
      :run="run"
      use-jump
      @end="handleCallback"
    />
    <button
      class="start-btn"
      @click="run = true"
    >
      start
    </button>
  </div>
</template>
<script>
import Tutorial from '@/components/Tutorial';

export default {
  name: 'TestTutorial',
  components: { Tutorial },
  data() {
    return {
      run: false,
      items: [
        { word: this.randomWord(), style: this.randomStyle() },
        { word: this.randomWord(), style: this.randomStyle() },
        { word: this.randomWord(), style: this.randomStyle() },
      ],
      steps: [
        {
          target: '.box-item-0',
          content: 'blah~ blah~',
          showSkip: true,
        },
        {
          target: '.box-item-1',
          content: 'blah~ blah~2',
          showSkip: true,
        },
        {
          target: '.box-item-2',
          content: 'blah~ blah~3',
        },
      ],
    };
  },
  methods: {
    startTour() {
    },
    randomStyle() {
      // const top = Math.floor(Math.random() * 1000);
      const left = Math.floor(Math.random() * 1000);
      return {
        color: 'white',
        fontWeight: 'bold',
        top: `${100}px`,
        left: `${left}px`,
      };
    },
    randomWord() {
      const words = ['monitor', 'program', 'application', 'keyboard', 'javascript', 'gaming', 'network'];

      return words[Math.floor(Math.random() * words.length)];
    },
    handleCallback(result) {
      console.log(result);
      this.run = false;
    },
  },
};
</script>
<style lang="scss" scoped>
.main-box {
  color: black;
}
.box {
  width: 100%;
  > div {
    position: relative;
    height: 1200px;
    width: 100%;
    > div {
      position: absolute;
      width: 400px;
      height: 100px;
      display: flex;
      justify-content: center;
      align-items: center;
      border: 1px solid;
    }
  }
  > div:nth-child(1) {
    background-color: red;
  }
  > div:nth-child(2) {
    background-color: blue;
  }
  > div:nth-child(3) {
    background-color: green;
  }
}
.start-btn {
  position: fixed;
  left: 50%;
  top: 20px;
  transform: translateX(-50%);
}
</style>
