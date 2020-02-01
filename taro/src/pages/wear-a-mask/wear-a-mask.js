const testImage = 'https://n1image.hjfile.cn/res7/2020/01/31/8ab8ff439233f3beae97a06c2b2bdec2.jpeg'

import Taro, { Component } from '@tarojs/taro'
import { View, Image, Input, Button, Canvas } from '@tarojs/components'
// import PageWrapper from 'components/page-wrapper'
import ImageCropper from 'components/image-cropper-taro'
import fetch from 'utils/fetch'
import { apiAnalyzeFace } from 'constants/apis'
import { getSystemInfo } from 'utils/common'
import { getHatInfo, getMouthInfo, getBase64Main } from 'utils/face-utils'
import { srcToBase64Main } from 'utils/canvas-drawing'

import { NOT_FACE, ONE_FACE } from 'constants/image-test'
import { TaroCropper } from 'taro-cropper'

// const testImg = 'https://n1image.hjfile.cn/res7/2020/01/31/85a57f8e140431329c0439a00e13c1a0.jpeg'
const testImg = 'https://n1image.hjfile.cn/res7/2020/02/01/73b0d0794e4390779767721f453b9794.png'

const imageData = ONE_FACE

import './styles.styl'

const { windowWidth } = getSystemInfo()
const CANVAS_SIZE = 300
const MASK_SIZE = 100

const resetState = () => {
  return {
    hatCenterX: windowWidth / 2,
    hatCenterY: 150,
    cancelCenterX: windowWidth / 2 - 50 - 2,
    cancelCenterY: 100,
    handleCenterX: windowWidth / 2 + 50 - 2,
    handleCenterY: 200,

    hatSize: 100 / (375 / windowWidth),

    scale: 1,
    rotate: 0
  }
}

// @CorePage
class Index extends Component {
  config = {
    navigationBarTitleText: '首页',
  }

  constructor(props) {
    super(props);
    this.catTaroCropper = this.catTaroCropper.bind(this);
    this.state = {
      ...resetState(),
      originSrc:  '', //testImg,
      cutImageSrc: '', //testImg,
      imgList: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      currentHatId: 1

    }
  }

  componentDidMount() {
    this.setState({
      cutImageSrc: imageData
    })
    this.onAnalyzeFace(getBase64Main(imageData))
  }



  catTaroCropper(node) {
    this.taroCropper = node;
    console.log('this.taroCropper :', this.taroCropper);
  }

  onChooseImage = () => {
    Taro.chooseImage({
      count: 1,
      sizeType: ['compressed'],
    }).then(res => {
      // console.log(res);
      this.setState({
        originSrc: res.tempFilePaths[0]
      });
    })
  }

  onCut = (cutImageSrc) => {
    let that = this
    console.log('cutImageSrc :', cutImageSrc);
    this.setState({
      cutImageSrc,
      originSrc: ''
    }, async () => {
        srcToBase64Main(cutImageSrc, (base64Main) => {
          that.onAnalyzeFace(base64Main)
        })
    })
  }


  onAnalyzeFace = async (base64Main = '' ) => {
    if (!base64Main) return

    try {
      const res2 = await fetch({
        url: apiAnalyzeFace,
        type: 'post',
        data: {
          Image: base64Main,
          Mode: 1,
          FaceModelVersion: '3.0'
        }
      })

      const info = getMouthInfo(res2)
      let { faceWidth, angle, mouthMidPoint, ImageWidth, mouthAngle } = info[0]
      let dpr = ImageWidth / CANVAS_SIZE * (375 / windowWidth)

      const hatCenterX = mouthMidPoint.X / dpr
      const hatCenterY =  mouthMidPoint.Y / dpr
      const scale = faceWidth / MASK_SIZE / dpr
      const rotate = mouthAngle


      this.setState({
        hatCenterX,
        hatCenterY,
        scale,
        rotate,
      })

    } catch (error) {
      console.log('error :', error);
    }
  }

  onCancel = () => {
    this.setState({
      originSrc: ''
    })
    Taro.showToast({
      icon: 'none',
      title: '点击取消'
    })
  }

  onRemoveImage = () => {
    this.setState({
      ...resetState(),
      cutImageSrc: ''
    })
  }

  downloadImage = () => {
    const { cutImageSrc } = this.state
    Taro.saveImageToPhotosAlbum({
      filePath: cutImageSrc,
      success: res => {
        console.log('保存成功 :');
      },
      fail(e) {
        console.log("err:" + e);
      }
    });
  }

  render() {
    const {
      originSrc,
      cutImageSrc,
      currentHatId,

      hatCenterX,
      hatCenterY,
      cancelCenterX,
      cancelCenterY,
      handleCenterX,
      handleCenterY,

      hatSize,

      scale,
      rotate
    } = this.state
    let hatStyle = {
      top: hatCenterY - hatSize / 2 - 2 + 'px',
      left: hatCenterX - hatSize / 2 - 2 + 'px',
      transform: `rotate(${rotate+'deg'}) scale(${scale})`
    }

    return (
      <View className='mask-page'>
        <View className='main-wrap'>
          {cutImageSrc
            ? (
              <View className='image-wrap'>
                <Image
                  src={cutImageSrc}
                  mode='widthFix'
                  className='image-selected'
                />
                <Image class="hat" id='hat' src={require('../../images/mask-1.png')} style={hatStyle} />

              </View>
            )
            : (
              <View className='to-choose' onClick={this.onChooseImage}>
              </View>
            )
          }
          {!!cutImageSrc && (
            <View className='button-wrap'>
              <Button className='button-remove' onClick={this.onRemoveImage}></Button>
              <Button className='button-download'></Button>
            </View>
          )}
        </View>

        {
          cutImageSrc && (
            <Button onClick={this.downloadImage}>下载图片</Button>
          )
        }
        <View className='cropper-wrap' hidden={!originSrc}>
          <TaroCropper
            src={originSrc}
            cropperWidth={CANVAS_SIZE * 2}
            cropperHeight={CANVAS_SIZE * 2}
            ref={this.catTaroCropper}
            fullScreen
            onCut={this.onCut}
            hideCancelText={false}
            onCancel={this.onCancel}
          />
        </View>
      </View>
    )
  }
}