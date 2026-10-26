module.exports={
  appId:'com.danielopzs.arte.desktop',productName:'Arte Académico',artifactName:'Arte-Academico-${version}-${arch}.${ext}',
  directories:{output:'release'},asar:true,
  files:['dist/**/*','desktop/**/*','server/**/*','shared/**/*','config/**/*','package.json','!desktop/builder.cjs'],
  extraMetadata:{main:'desktop/main.cjs'},
  mac:{category:'public.app-category.education',target:[{target:'dmg',arch:['x64']},{target:'zip',arch:['x64']}],hardenedRuntime:true,notarize:!!process.env.APPLE_ID},
  publish:[{provider:'github',owner:'danielopzs',repo:'TecMty',releaseType:'draft'}],
};
