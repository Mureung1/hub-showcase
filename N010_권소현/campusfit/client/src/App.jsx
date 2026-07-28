import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Main from "./pages/Main";
import CategoryList from "./pages/CategoryList";
import ListingDetail from "./pages/ListingDetail";
import Board from "./pages/Board";
import PostDetail from "./pages/PostDetail";
import WriteBoardPost from "./pages/WriteBoardPost";
import Bookmarks from "./pages/Bookmarks";
import MyPosts from "./pages/MyPosts";
import PickListingForBoard from "./pages/PickListingForBoard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Main />} />
          <Route path="category/:categoryId" element={<CategoryList />} />
          <Route path="listing/:listingId" element={<ListingDetail />} />
          <Route path="board" element={<Board />} />
          <Route path="board/write" element={<PickListingForBoard />} />
          <Route path="board/listing/:listingId" element={<Board />} />
          <Route path="board/listing/:listingId/write" element={<WriteBoardPost />} />
          <Route path="board/post/:postId" element={<PostDetail />} />
          <Route path="board/post/:postId/edit" element={<WriteBoardPost />} />
          <Route path="bookmarks" element={<Bookmarks />} />
          <Route path="my-posts" element={<MyPosts />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App
