Component({
  properties: {
    title: {
      type: String,
      value: 'Home',
    },
    logo: {
      type: String,
      value: '/assets/images/brand/KB_Logo.png',
    },
    secondaryLogo: {
      type: String,
      value: '/assets/images/brand/RVSChinaDT_Logo.png',
    },
    showBack: {
      type: Boolean,
      value: false,
    },
  },
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
  },
  lifetimes: {
    attached() {
      this.syncNavMetrics();
    },
  },
  methods: {
    syncNavMetrics() {
      const windowInfo = wx.getWindowInfo();
      const menuButton = wx.getMenuButtonBoundingClientRect();
      const statusBarHeight = windowInfo.statusBarHeight || 20;
      const gap = Math.max(menuButton.top - statusBarHeight, 4);
      const navBarHeight = menuButton.height + gap * 2;

      this.setData({
        statusBarHeight,
        navBarHeight,
      });
    },
    onBack() {
      wx.navigateBack({
        fail() {
          wx.switchTab({
            url: '/pages/kb-life/index',
          });
        },
      });
    },
  },
});
