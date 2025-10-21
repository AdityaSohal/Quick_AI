import React from 'react'
import { Route, Routes } from 'react-router-dom'
import { Home } from './pages/Home'
import Layout from './pages/Layout'
import Dashboard from './pages/Dashboard'
import BlogTitles from './pages/BlogTitles'
import RemoveBackgorund from './pages/RemoveBackgorund'
import GenerateImages from './pages/GenerateImages'
import RemoveObject from './pages/RemoveObject'
import ReviewResume from './pages/ReviewResume'
import Community from './pages/Community'
import WriteArticle from './pages/WriteArticle'
import { useAuth } from '@clerk/clerk-react'
import { useEffect } from 'react'
import {Toaster} from 'react-hot-toast'
import { GenerateImageProvider } from './contexts/GenerateImageContext'

const App = () => {
  //const {getToken}= useAuth()
  // useEffect(()=>{
  //   getToken().then((token)=>console.log(token));
  // },[])
  return (
    <GenerateImageProvider>
      <div>
        <Toaster/>
      <Routes>
        <Route path='/'element={<Home/>}/>
        <Route path='/ai' element={<Layout/>}>
        <Route index element = {<Dashboard/>}/>
        <Route path='write-article' element={<WriteArticle/>}/>
        <Route path='blog-titles' element={<BlogTitles/>}/>
        <Route path='remove-background' element={<RemoveBackgorund/>}/>
        <Route path='generate-images' element={<GenerateImages/>}/>
        <Route path='remove-object' element={<RemoveObject/>}/>
        <Route path='review-resume' element={<ReviewResume/>}/>
        <Route path='community' element={<Community/>}/>
        </Route>
      </Routes>
      </div>
    </GenerateImageProvider>
  )
}

export default App