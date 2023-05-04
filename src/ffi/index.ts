import path from 'node:path'
import ffi from '@tigerconnect/ffi-napi'
import ref from '@tigerconnect/ref-napi'
import { Singleton } from '../utils/singleton'
import { createWrapper } from './proxy'
import { dependencesPrefix } from '../config'

export { createWrapper } from './proxy'

type AcceptPlatform = 'win32' | 'linux' | 'darwin'

const dependences: Record<AcceptPlatform, string[]> = {
  win32: ['opencv_world4_maa.dll', 'onnxruntime_maa.dll', 'MaaDerpLearning.dll'],
  linux: ['libopencv_world4.so', 'libonnxruntime.so', 'libMaaDerpLearning.so'],
  darwin: ['libopencv_world4.dylib', 'libonnxruntime.dylib', 'libMaaDerpLearning.dylib'],
}

const target: Record<AcceptPlatform, string> = {
  win32: 'MaaCore.dll',
  darwin: 'libMaaCore.dylib',
  linux: 'libMaaCore.so',
}

type typeVoidPointer = ref.Pointer<void>
export type AsstInstance = typeVoidPointer

/** Some types for core */
const BoolType = ref.types.bool
const IntType = ref.types.int
const AsstAsyncCallIdType = ref.types.int
// const AsstBoolType = ref.types.uint8
// const IntArrayType = ArrayType(IntType)
// const DoubleType = ref.types.double
const ULLType = ref.types.ulonglong
const VoidType = ref.types.void
const StringType = ref.types.CString
// const StringPtrType = ref.refType(StringType)
// const StringPtrArrayType = ArrayType(StringType)
const AsstType = ref.types.void
const AsstPtrType = ref.refType(AsstType)
// const TaskPtrType = ref.refType(AsstType)
const BuffType = ref.refType(ref.types.void)
const CustomArgsType = BuffType
const IntPointerType = ref.refType(IntType)

/**
const CallBackType = ffi.Function(ref.types.void, [
  IntType,
  StringType,
  ref.refType(ref.types.void)
])
 */

function checkPlatform(platform: NodeJS.Platform): platform is AcceptPlatform {
  return ['win32', 'linux', 'darwin'].includes(platform)
}

function loadCore(prefix: string, platform: AcceptPlatform) {
  const depLibs = dependences[platform].map(coreLib => {
    return ffi.DynamicLibrary(path.join(prefix, coreLib))
  })
  const coreLib = ffi.DynamicLibrary(path.join(prefix, target[platform]), ffi.RTLD_NOW)
  return [depLibs, coreLib] as const
}

function extractFunction(coreLib: ffi.DynamicLibrary) {
  const funcs = {
    AsstSetUserDir: ffi.ForeignFunction(
      coreLib.get('AsstSetUserDir'),
      BoolType,
      [StringType],
      ffi.FFI_STDCALL
    ),

    AsstLoadResource: ffi.ForeignFunction(
      coreLib.get('AsstLoadResource'),
      BoolType,
      [StringType],
      ffi.FFI_STDCALL
    ),

    AsstSetStaticOption: ffi.ForeignFunction(
      coreLib.get('AsstSetStaticOption'),
      BoolType,
      [IntType, StringType],
      ffi.FFI_STDCALL
    ),

    // AsstCreate: ffi.ForeignFunction(coreLib.get('AsstCreate'), AsstPtrType, [], ffi.FFI_STDCALL),

    AsstCreateEx: ffi.ForeignFunction(
      coreLib.get('AsstCreateEx'),
      AsstPtrType,
      [BuffType, CustomArgsType],
      ffi.FFI_STDCALL
    ),

    AsstDestroy: ffi.ForeignFunction(
      coreLib.get('AsstDestroy'),
      VoidType,
      [AsstPtrType],
      ffi.FFI_STDCALL
    ),

    AsstSetInstanceOption: ffi.ForeignFunction(
      coreLib.get('AsstSetInstanceOption'),
      BoolType,
      [AsstPtrType, IntType, StringType],
      ffi.FFI_STDCALL
    ),

    // AsstConnect: ffi.ForeignFunction(
    //   coreLib.get('AsstConnect'),
    //   BoolType,
    //   [AsstPtrType, StringType, StringType, StringType],
    //   ffi.FFI_STDCALL
    // ),

    AsstAppendTask: ffi.ForeignFunction(
      coreLib.get('AsstAppendTask'),
      IntType,
      [AsstPtrType, StringType, StringType],
      ffi.FFI_STDCALL
    ),

    AsstSetTaskParams: ffi.ForeignFunction(
      coreLib.get('AsstSetTaskParams'),
      BoolType,
      [AsstPtrType, IntType, StringType],
      ffi.FFI_STDCALL
    ),

    AsstStart: ffi.ForeignFunction(
      coreLib.get('AsstStart'),
      BoolType,
      [AsstPtrType],
      ffi.FFI_STDCALL
    ),

    AsstStop: ffi.ForeignFunction(
      coreLib.get('AsstStop'),
      BoolType,
      [AsstPtrType],
      ffi.FFI_STDCALL
    ),

    // AsstRunning: ffi.ForeignFunction(
    //   coreLib.get('AsstRunning'),
    //   BoolType,
    //   [AsstPtrType],
    //   ffi.FFI_STDCALL
    // ),

    AsstAsyncConnect: ffi.ForeignFunction(
      coreLib.get('AsstAsyncConnect'),
      AsstAsyncCallIdType,
      [AsstPtrType, StringType, StringType, StringType, BoolType],
      ffi.FFI_STDCALL
    ),

    AsstAsyncClick: ffi.ForeignFunction(
      coreLib.get('AsstAsyncClick'),
      AsstAsyncCallIdType,
      [AsstPtrType, IntType, IntType, BoolType],
      ffi.FFI_STDCALL
    ),

    AsstAsyncScreencap: ffi.ForeignFunction(
      coreLib.get('AsstAsyncScreencap'),
      AsstAsyncCallIdType,
      [AsstPtrType, BoolType],
      ffi.FFI_STDCALL
    ),

    AsstGetImage: ffi.ForeignFunction(
      coreLib.get('AsstGetImage'),
      ULLType,
      [AsstPtrType, BuffType, ULLType],
      ffi.FFI_STDCALL
    ),

    AsstGetUUID: ffi.ForeignFunction(
      coreLib.get('AsstGetUUID'),
      ULLType,
      [AsstPtrType, BuffType, ULLType],
      ffi.FFI_STDCALL
    ),

    // AsstGetTasksList: ffi.ForeignFunction(
    //   coreLib.get('AsstGetTasksList'),
    //   ULLType,
    //   [AsstPtrType, IntPointerType, ULLType],
    //   ffi.FFI_STDCALL
    // ),

    // AsstGetNullSize: ffi.ForeignFunction(
    //   coreLib.get('AsstGetNullSize'),
    //   ULLType,
    //   [],
    //   ffi.FFI_STDCALL
    // ),

    AsstGetVersion: ffi.ForeignFunction(
      coreLib.get('AsstGetVersion'),
      StringType,
      [],
      ffi.FFI_STDCALL
    ),

    AsstLog: ffi.ForeignFunction(
      coreLib.get('AsstLog'),
      VoidType,
      [StringType, StringType],
      ffi.FFI_STDCALL
    ),
  }

  return funcs
}

const corePrefixDefault = path.join(dependencesPrefix, 'core')

@Singleton
export class CoreLoader {
  loaded: boolean = false
  private depLibs!: ffi.DynamicLibrary[]
  private coreLib!: ffi.DynamicLibrary
  private coreLibInterface!: ReturnType<typeof extractFunction>

  load(prefix = corePrefixDefault) {
    const platform = process.platform
    if (!checkPlatform(platform)) {
      console.log(`Platform ${platform} not supported`)
      return false
    }
    try {
      const [dep, core] = loadCore(prefix, platform)
      this.depLibs = dep
      this.coreLib = core
      this.coreLibInterface = extractFunction(core)
      this.loaded = true
      return true
    } catch (err) {
      console.log((err as Error).message)
      return false
    }
  }

  // 须提前停止所有实例
  dispose() {
    if (!this.loaded) {
      return false
    }
    try {
      this.coreLib.close()
      this.depLibs.forEach(l => l.close())
      this.loaded = false
      return true
    } catch (err) {
      console.error((err as Error).message)
      return false
    }
  }

  config(resource = corePrefixDefault, userdir = '.') {
    this.SetUserDir(userdir)
    this.LoadResource(resource)
  }

  SetUserDir(path: string) {
    return this.coreLibInterface.AsstSetUserDir(path)
  }

  LoadResource(path: string) {
    return this.coreLibInterface.AsstLoadResource(path)
  }

  // SetStaticOption

  // Create

  static bindCallback(callback: (code: number, data: string) => void) {
    return ffi.Callback(ref.types.void, [ref.types.int, ref.types.CString, BuffType], callback)
  }

  // TODO: 可能无法创建
  CreateEx(callback: Buffer, wrap?: true): InstanceWrapper
  CreateEx(callback: Buffer, wrap: false): AsstInstance
  CreateEx(callback: Buffer, wrap = true) {
    function createVoidPointer() {
      return ref.alloc(BuffType)
    }

    const instance = this.coreLibInterface.AsstCreateEx(
      callback as typeVoidPointer,
      createVoidPointer()
    )
    return wrap ? createWrapper(instance) : instance
  }

  Destroy(instance: AsstInstance) {
    this.coreLibInterface.AsstDestroy(instance)
  }

  SetInstanceOption(instance: AsstInstance, key: number, value: string) {
    return this.coreLibInterface.AsstSetInstanceOption(instance, key, value)
  }

  // Connect

  AppendTask(instance: AsstInstance, type: string, param: string) {
    return this.coreLibInterface.AsstAppendTask(instance, type, param)
  }

  SetTaskParam(instance: AsstInstance, key: number, value: string) {
    return this.coreLibInterface.AsstSetTaskParams(instance, key, value)
  }

  Start(instance: AsstInstance) {
    return this.coreLibInterface.AsstStart(instance)
  }

  Stop(instance: AsstInstance) {
    return this.coreLibInterface.AsstStop(instance)
  }

  AsyncConnect(
    instance: AsstInstance,
    adb: string,
    address: string,
    config: string,
    block = false
  ) {
    return this.coreLibInterface.AsstAsyncConnect(instance, adb, address, config, block)
  }

  AsyncClick(instance: AsstInstance, x: number, y: number, block = false) {
    return this.coreLibInterface.AsstAsyncClick(instance, x, y, block)
  }

  AsyncScreencap(instance: AsstInstance, block = false) {
    return this.coreLibInterface.AsstAsyncScreencap(instance, block)
  }

  GetImage(instance: AsstInstance, preAlloc = 1280 * 720 * 3 + 16) {
    const buf = Buffer.alloc(preAlloc) as typeVoidPointer
    // 假设总是可以装下, 且不会超过uint32
    const len = this.coreLibInterface.AsstGetImage(instance, buf, buf.length) as number
    return buf.slice(0, len).toString('base64')
  }

  GetUUID(instance: AsstInstance, preAlloc = 128) {
    const buf = Buffer.alloc(preAlloc) as typeVoidPointer
    // 假设总是可以装下, 且不会超过uint32
    const len = this.coreLibInterface.AsstGetUUID(instance, buf, buf.length) as number
    return buf.slice(0, len).toString('utf-8')
  }

  GetVersion() {
    return this.coreLibInterface.AsstGetVersion()
  }

  Log(level: string, message: string) {
    this.coreLibInterface.AsstLog(level, message)
  }
}

type WantFunction = (instance: AsstInstance, ...args: any[]) => any
type DiscardFunction = () => any
type DiscardFunctionKey = 'CreateEx'
type Transfer<Func extends WantFunction> = Func extends (
  instance: AsstInstance,
  ...args: infer Arg
) => infer Ret
  ? (...args: Arg) => Ret
  : never
type CoreLoaderFunction = keyof CoreLoader
type FunctionPair<
  key extends CoreLoaderFunction = Exclude<CoreLoaderFunction, DiscardFunctionKey>
> = key extends unknown
  ? CoreLoader[key] extends WantFunction
    ? CoreLoader[key] extends DiscardFunction
      ? never
      : [key, CoreLoader[key]]
    : never
  : never
type MappedKey = FunctionPair[0]
type FunctionMap = {
  [key in MappedKey]: CoreLoader[key] extends WantFunction ? Transfer<CoreLoader[key]> : never
}
export type InstanceWrapper = { instance: AsstInstance } & FunctionMap
